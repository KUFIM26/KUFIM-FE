# Vercel 프런트엔드 연결을 위한 백엔드 설정 요청

대상 프런트엔드: https://kufim-fe.vercel.app
대상 API: https://32-236-74-117.sslip.io

## 필수: CORS Origin 허용

`Origin: https://kufim-fe.vercel.app`을 보낸 공개 GET 요청도 현재 `403 Invalid CORS request`로 응답합니다. 기존 개발 origin을 유지하면서 이 주소를 CORS 허용 목록에 추가해주세요. 관리자 세션을 사용하므로 credentials 허용도 유지해야 합니다.

- 요청 메서드: GET, POST, PATCH, DELETE, OPTIONS
- 요청 헤더: Content-Type, X-Client-Token, X-XSRF-TOKEN, Idempotency-Key
- 관리자 CSRF 검증과 Secure·HttpOnly·SameSite 쿠키 정책은 유지합니다.
- FE의 `/api/*` 요청은 Vercel rewrite를 통해 API 서버로 전달됩니다.

설정 후 브라우저에서 로그인 → 새로고침 후 세션 복원 → 로그아웃, 관리자 저장 요청의 CSRF 검증을 확인하면 됩니다. 단순 GET 조회는 브라우저에서 Origin을 보내지 않아 이 문제와 무관하게 동작할 수 있습니다.

## 실시간 연결은 별도 구성

현재 Vercel 정적 배포에는 `/ws` 경로가 없어 FE에서 WebSocket 시도를 끄고 REST 폴링을 사용합니다. WebSocket 재활성화에는 실제 중계 경로가 필요합니다. backend WebSocket Origin 허용만으로 Vercel의 `/ws` 경로가 생기지는 않습니다.

브라우저에서 API 서버의 `/ws`에 직접 연결하는 방식을 선택한다면 FE origin 허용과 관리자 인증 전달을 함께 설계해야 합니다. 현재 Vercel 도메인의 관리자 쿠키는 다른 도메인으로 향하는 WebSocket에 전달되지 않으므로 URL만 바꾸는 방식으로는 관리자 구독이 복구되지 않습니다.
