# 신고 접수시간(createdAt)이 한국 시간과 9시간 어긋나는 문제

대상 API: `GET /reports/me`, `GET /reports/{id}`, 관리자 신고 목록·상세 등 `createdAt`을 내려주는 응답 전체

## 증상

신고 카드에 표시되는 접수시간이 실제 접수 시각(KST)보다 9시간 이르게 나옵니다. 같은 신고의 `receivedAt`, `inProgressAt`, `completedAt`은 정상입니다.

FE는 응답 문자열을 그대로 `new Date()`로 읽어 `Asia/Seoul` 기준으로 표시하므로(`src/data/report-design.ts`의 `reportDate`), 응답의 시각 자체가 맞아야 합니다.

## 운영 서버 실측(2026-11-11)

KST 17:38:50(UTC 08:38:50)에 테스트 신고(reportId 8, 확인 후 취소함)를 등록한 결과입니다.

| 항목 | 값 |
| --- | --- |
| 응답 헤더 `Date` | `Wed, 11 Nov 2026 08:38:50 GMT` |
| `POST /reports` 응답 `createdAt` | `2026-11-11T08:38:50.587337338+09:00` |
| `GET /reports/8` 응답 `createdAt` | `2026-11-11T08:38:50.587+09:00` |
| 기대값 | `2026-11-11T17:38:50+09:00` |

UTC 시각에 `+09:00`이 붙어 정확히 9시간 이르게 내려옵니다. 같은 서버의 `serverTime`(`ApiClock.now()` 기반)은 정상입니다.

## 원인

- `BaseEntity.createdAt` / `updatedAt`은 `@CreatedDate` / `@LastModifiedDate`로 채워집니다. Spring Data 기본 `DateTimeProvider`는 `LocalDateTime.now()`, 즉 **JVM 기본 시간대**를 씁니다.
- `deploy/docker-compose.yml`의 `backend` 서비스에는 `TZ`가 없고(`mysql`에만 있음), `eclipse-temurin:17-jre` 이미지의 기본 시간대는 UTC입니다. 그래서 `created_at`에는 UTC 시각이 저장됩니다.
- 응답을 만들 때 `ApiClock.offset()`이 이 값에 `+09:00`을 그대로 붙입니다. KST 14:00(UTC 05:00)에 접수된 신고는 `14:00+09:00`으로 나가야 하는데, 실제로는 UTC 값 `05:00`에 `+09:00`이 붙어 `05:00+09:00`, 즉 9시간 이른 시각이 됩니다.
- 상태 변경 시각은 `ApiClock.now()`(KST 고정)로 기록되어 영향이 없습니다.

`jackson.time-zone`, `hibernate.jdbc.time_zone` 설정은 `LocalDateTime` 생성 시점의 시간대에는 영향을 주지 않습니다.

## 요청

아래 중 하나(둘 다 적용해도 무방)로 감사 시각을 KST로 고정해주세요.

1. `JpaConfig`에 `DateTimeProvider`를 등록해 `ApiClock.now()`를 쓰도록 합니다.

   ```java
   @Configuration
   @EnableJpaAuditing(dateTimeProviderRef = "kstDateTimeProvider")
   public class JpaConfig {
       @Bean
       public DateTimeProvider kstDateTimeProvider() {
           return () -> Optional.of(ApiClock.now());
       }
   }
   ```

2. `deploy/docker-compose.yml`의 `backend.environment`에 `TZ: Asia/Seoul`을 추가합니다.

1번은 실행 환경과 무관하게 동작하므로 권장합니다.

## 기존 데이터

이미 저장된 행의 `created_at`, `updated_at`은 UTC로 들어가 있으므로, 수정 배포 시점에 `BaseEntity`를 상속한 테이블 전체에 대해 +9시간 보정이 한 번 필요합니다. 보정 전에 운영 DB에서 실제 저장값이 UTC인지 먼저 확인해주세요.

## 같은 영향을 받는 곳

`BaseEntity.getCreatedAt()`을 응답에 쓰는 다른 API(알림, 부스, 문자 발송 기록, 관리자 계정 등)도 같은 원인으로 9시간 어긋날 수 있습니다.
