# KUFIM FE

건국대학교 축제 안내·부스 웨이팅 모바일 웹입니다. React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Axios를 사용하며 `KUFIM-BE`의 `/api/v1` API에 연결됩니다. 기본 실행은 배포된 API 서버 `https://32-236-74-117.sslip.io`에 연결합니다. Swagger 명세의 사용자·관리자 API를 사용합니다.

## 실행

FE 폴더에서 Node.js 22.12 이상으로 실행합니다.

```sh
npm install
cp .env.example .env.local
npm run dev
```

### 배포 서버 연결하기 (기본)

저장소의 `.env`에는 공개 연결 설정만 포함합니다. `npm run dev`로 실행하고 `http://localhost:5173`에 접속하세요.

```dotenv
VITE_API_BASE_URL=/api/v1
API_PROXY_TARGET=https://32-236-74-117.sslip.io
```

- [Swagger UI](https://32-236-74-117.sslip.io/swagger-ui/index.html) · [OpenAPI JSON](https://32-236-74-117.sslip.io/v3/api-docs)
- 브라우저는 로컬 FE의 `/api/v1`에 요청하며 Vite가 배포 서버로 전달합니다. `/ws`도 동일 서버로 연결합니다.
- 관리자 로그인은 `/admin/login`에서 실제 서버 계정을 입력합니다. 자격 증명은 저장소나 `VITE_` 환경변수에 넣지 않습니다.
- 프록시는 같은 FE origin에서 온 요청의 Origin을 대상 서버로 맞추고, 쿠키 Domain을 로컬 호스트에 맞춥니다. 서버의 Secure·HttpOnly·SameSite 설정은 유지합니다. Secure 쿠키를 사용하는 로컬 검증은 `localhost`에서 실행합니다.
- 서버에 등록된 축제·부스·공연·공지만 표시합니다. 빈 목록이나 API 오류를 목업 데이터로 대체하지 않습니다.
- 혼잡도 입력과 CSV 다운로드는 이번 연결 범위에서 제외합니다.

다른 설정이 필요하면 `.env.local`에서 덮어쓰고 개발 서버를 재시작하세요. 로컬 BE를 사용할 때는 `API_PROXY_TARGET=http://127.0.0.1:8080`으로 바꾸면 됩니다. 백엔드 코드를 수정할 필요는 없습니다.

### 배포 서버 검증

```sh
npm run test:remote
```

배포 서버의 공개 화면과 실제 STOMP 연결을 검사합니다. 관리자 테스트는 `KUFIM_TEST_ADMIN_LOGIN`, `KUFIM_TEST_ADMIN_PASSWORD`가 실행 환경에 있을 때만 수행합니다. 관리자 검증은 로그인·세션 복원·목록·QR 조회·로그아웃만 수행하며, 축제 콘텐츠나 웨이팅 데이터를 생성·변경하지 않습니다. 인증 정보가 남지 않도록 이 테스트의 trace는 저장하지 않습니다.

## 요청한 폴더 구조

```text
src/
  apis/
    axios.ts                # baseURL, 쿠키·CSRF·방문자 토큰, 오류 처리
    type.ts                 # BE 요청·응답 타입
    adapters.ts             # BE 필드·enum ↔ 화면 표시 데이터
  hooks/
    useAuthApi.ts
    useFestivalApi.ts
    useBoothApi.ts
    useFacilityApi.ts
    usePerformanceApi.ts
    useNoticeApi.ts
    useWaitingApi.ts
    useNotificationApi.ts
    useResource.ts          # 비동기 조회·재조회·폴링, 중복 클릭 방지
  app/
    AuthProvider.tsx        # 서버 관리자 세션 상태
    FestivalProvider.tsx    # API에서 불러온 공통 콘텐츠
  data/models.ts            # 화면용 타입과 표시 분류
  pages/                    # 사용자·관리자 화면
  components/               # 공통 UI
  router/router.tsx
```

`use...Api`는 요청하신 형태의 **API 메서드 객체**입니다. React 상태 훅 자체는 아니므로 이벤트 핸들러나 비동기 함수에서도 호출할 수 있습니다. Axios 응답을 그대로 반환하며 BE 응답 본문은 `{ success, data, error }`입니다.

```ts
import { useBoothApi } from '../hooks/useBoothApi'
import { useNoticeApi } from '../hooks/useNoticeApi'

const response = await useBoothApi.findAll()
const booths = response.data.data

await useNoticeApi.make({
  title: '행사 안내',
  content: '축제 운영 안내입니다.',
  category: 'INFO',
})
```

예시의 Dept API나 외부 서비스 주소는 추가하지 않았습니다. KUFIM의 실제 API 경로·인증 방식을 사용합니다.

## 주소와 인증

`.env.local`의 `VITE_API_BASE_URL`이 Axios 기본 주소입니다. 기본값은 `/api/v1`이며 Vite가 `/api`·`/ws` 요청을 `API_PROXY_TARGET`(기본 `https://32-236-74-117.sslip.io`)으로 전달합니다. 환경변수를 바꾼 뒤에는 Vite를 재시작하세요.

- 관리자: `KUFIMSESSION` HttpOnly 쿠키와 `XSRF-TOKEN` → `X-XSRF-TOKEN` 헤더. Bearer accessToken은 사용하지 않습니다.
- 방문자: UUID v4를 `localStorage['kufim.clientToken']`에 유지하고 `X-Client-Token` 헤더로 보냅니다. 학번·전화번호는 localStorage에 저장하지 않습니다.
- 관리자 세션은 관리자 화면 진입 시 확인합니다. 세션 만료(401) 또는 CSRF 검증 실패(`A005`) 시 로그인 화면으로 이동합니다. 일반 권한 오류(`A003`)에서는 로그아웃하지 않습니다. 방문자 토큰은 유지하며 로그인 실패는 입력 화면에서 안내합니다.
- `SUPER_ADMIN`은 콘텐츠·웨이팅 화면, `BOOTH_ADMIN`은 배정된 부스의 운영 화면에 접근합니다. 최종 권한 검사는 BE가 수행합니다.

[Axios 공식 설정 문서](https://axios-http.com/docs/req_config)의 쿠키·XSRF 설정을 사용합니다.

## 연결 범위

- 축제 요약, 실제 날짜·무대 필터, 부스·시설·공연·공지 목록과 상세
- 관리자 공지·공연·부스·시설 등록·수정과 저장 실패 표시
- BE 도면 이미지·부스/시설 위치 표시 및 관리자 위치 저장
- `/w/:boothCode` QR 진입 → 접수 → 내 대기표 복원·취소
- 관리자 호출·재호출·입장·노쇼·취소, 마스킹된 명단, 권한 있는 연락처 조회
- 부스 목록의 대기 팀 수·예상 시간 표시, 부스 운영 상태·팀당 예상 시간 저장
- 서버가 생성한 QR PNG 다운로드, QR이 없는 기존 부스의 총괄 관리자 최초 발급(새 부스는 BE가 자동 발급)
- 알림 목록·개별 읽음·전체 읽음·페이지 이동

내 대기표·부스 대기 현황·관리자 명단·공지는 STOMP(`/ws`) 이벤트를 받으면 기존 REST API로 다시 조회합니다. 로그인·세션 복원·로그아웃 시 소켓을 다시 연결해 현재 관리자 쿠키를 반영합니다. 연결 중에는 60초 안전망 조회를 유지하며, 연결이 끊기면 웨이팅·관리자 명단은 5초, 부스·공지는 15초 주기 조회로 돌아갑니다. 알림함은 기존 10초 주기 조회를 유지합니다. 재시도 키는 접수 요청 및 호출 요청이 실패했을 때 같은 작업의 재시도에 재사용됩니다. 관리자 자동 취소 시간은 BE 정책에 따라 최초 호출 후 **10분 고정**으로 표시됩니다.

휴대폰 기본 카메라로 현장 QR을 스캔합니다. 웹 내부 카메라 인식은 구현하지 않았습니다. 문자 발송은 BE 공급자 연결 전까지 `NOT_CONFIGURED`이며 화면에서 이를 안내합니다. 축제·무대·첫 지도 도면·관리자 계정 관리는 기존 BE API/Swagger를 사용합니다.

## 검증

```sh
npm run build
npm run lint
npm test
```

`npm test`는 실제 API 모드로 빌드한 뒤 브라우저의 API 응답을 테스트 fixture로 제어해 요청 payload·토큰·CSRF·저장·오류·새로고침 복원 등을 검증합니다. 프로덕션 코드에서는 fixture를 가져오지 않습니다. 브라우저가 없으면 `npx playwright install chromium`을 실행하세요.

실제 BE와 연결하는 검증:

```sh
# BE 폴더에서 먼저 실행
./gradlew test bootJar
# FE 폴더에서 실행
npm run test:integration
```

통합 테스트는 Java 실행 환경이 필요합니다. 전용 BE 포트 18080, FE 포트 4174, 메모리 H2 DB와 일회용 테스트 관리자를 사용하며 기존 로컬 DB를 변경하지 않습니다. 테스트가 끝나면 서버를 종료합니다. 로그인, 실제 저장, QR PNG, QR 접수, 복원, 호출·알림·입장을 검증합니다.

## 배포

`npm run build` 결과는 `dist/`입니다. `vercel.json`은 `/api/:path*`를 `https://32-236-74-117.sslip.io/api/:path*`로 전달한 뒤 나머지 URL에 SPA fallback을 적용합니다. API 응답은 캐시하지 않습니다. 수정된 설정은 새 배포에 반영해야 합니다.

Vercel 빌드는 `VITE_REALTIME_ENABLED=false`로 실행합니다. 현재 정적 배포에는 `/ws` 처리 경로가 없으므로 WebSocket 연결을 시도하지 않고 기존 REST 폴링으로 갱신합니다. 로컬 개발과 같은 origin의 WebSocket 프록시가 있는 환경에서는 기본 실시간 연결을 유지합니다. `VITE_REALTIME_ENABLED=true`로 켜려면 실제 `/ws` 처리 경로와 인증 전달 구성이 먼저 필요합니다.

현재 BE는 `Origin: https://kufim-fe.vercel.app` 요청을 403으로 거부하므로 관리자 로그인·저장 같은 브라우저 요청을 위해 해당 origin을 BE의 CORS 허용 목록에 추가해야 합니다. 프런트 배포 설정만으로 이 백엔드 정책을 변경하지 않습니다. 요청할 내용은 [백엔드 설정 요청](docs/backend-request.md)에 정리했습니다. 관리자 세션·CSRF 쿠키와 `X-Client-Token`·`Idempotency-Key` 전달은 기존 방식을 유지합니다.
