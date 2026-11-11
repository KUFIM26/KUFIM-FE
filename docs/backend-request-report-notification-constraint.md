# 관리자 신고 상세 진입 시 오류: 신고 알림이 DB 제약에 막힘

대상 API: `POST /admin/reports/{id}/receive`, `PUT /admin/reports/{id}/memo`, `POST /admin/reports/{id}/complete`

## 증상

관리자 신고 목록에서 `신청` 상태 신고를 누르면 상세 화면 대신 오류가 표시됩니다. "다시 시도"를 눌러도 같은 오류가 반복됩니다.

FE는 상세 진입 시 신고를 조회한 뒤, 상태가 `SUBMITTED`이면 자동으로 `POST /admin/reports/{id}/receive`를 호출합니다(`src/pages/AdminReportPages.tsx`의 로더). 이 호출이 실패하면 화면 전체가 오류 상태가 됩니다.

## 원인(코드 기준, 운영 서버 로그로 확인 필요)

- `ReportService.receive` → `applyTransition` → `notify()`가 `type = REPORT_STATUS`, `report_id`만 채우고 `notice_id`, `waiting_id`는 null인 `notification` 행을 저장합니다.
- `V2__waiting_api_contract.sql`의 `ck_notification_source` CHECK 제약은 아래 두 경우만 허용합니다.
  - `type = 'NOTICE'`이고 `notice_id`가 있는 경우
  - `type IN ('WAITING_CALL', 'WAITING_AUTO_CANCELED')`이고 `waiting_id`가 있는 경우
- `V7__report.sql`은 `notification.report_id` 컬럼과 FK만 추가하고 이 제약은 고치지 않았습니다.
- 그래서 `REPORT_STATUS` 알림 INSERT가 제약 위반으로 실패하고, `GlobalExceptionHandler`가 500 `C005 "서버 오류가 발생했습니다."`로 응답합니다. 트랜잭션이 롤백되어 상태가 `SUBMITTED`에 남으므로 매번 실패합니다.

같은 `notify()`를 쓰는 메모 저장과 완료 처리도 같은 이유로 실패할 것으로 보입니다.

운영 서버에 관리자 요청을 보낼 수 없어 500 응답 자체는 직접 확인하지 못했습니다. 서버 로그에서 `POST /admin/reports/{id}/receive` 시점의 `DataIntegrityViolationException`을 확인하면 확정됩니다.

## 요청

새 마이그레이션(`V8`)으로 제약을 갱신해주세요.

```sql
ALTER TABLE notification DROP CONSTRAINT ck_notification_source;
ALTER TABLE notification ADD CONSTRAINT ck_notification_source CHECK (
    (type = 'NOTICE' AND notice_id IS NOT NULL AND waiting_id IS NULL AND report_id IS NULL AND recipient_client_token IS NULL)
    OR (type IN ('WAITING_CALL', 'WAITING_AUTO_CANCELED') AND notice_id IS NULL AND waiting_id IS NOT NULL AND report_id IS NULL AND recipient_client_token IS NOT NULL)
    OR (type = 'REPORT_STATUS' AND notice_id IS NULL AND waiting_id IS NULL AND report_id IS NOT NULL AND recipient_client_token IS NOT NULL)
);
```

신고 접수 → 메모 저장 → 완료까지 이어지는 통합 테스트가 현재 없으므로 함께 추가를 권합니다.

## 다른 원인일 때의 화면 문구

화면에 뜨는 문구가 아래와 다르면 원인이 다릅니다.

| 화면 문구 | 원인 |
| --- | --- |
| 서버 오류가 발생했습니다. | 이 문서의 제약 위반(500 C005) |
| 보안 토큰이 만료되었습니다. 다시 로그인해 주세요. | CSRF 토큰 없음·만료(403 A005) |
| 총괄 관리자 권한이 필요합니다. | 권한 부족(403 A003) |
| 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요. | 네트워크·타임아웃 |
