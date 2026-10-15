# KUFIM FE

건국대학교 축제 안내·부스 웨이팅 모바일 웹입니다. React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Axios를 사용하며 `KUFIM-BE`의 `/api/v1` API에 연결됩니다. 기본 실행은 서버 없이 작동하는 목업 모드입니다. `VITE_USE_MOCK=false`로 실제 API 연결을 사용할 수 있습니다.

## 실행

FE 폴더에서 Node.js 22.12 이상으로 실행합니다.

```sh
npm install
cp .env.example .env.local
npm run dev
```

### 서버 없이 체험하기 (기본)

`npm run dev`만 실행하면 축제, 지도, 부스, 시설, 공연, 공지 샘플 데이터가 표시됩니다. 환경변수가 없어도 목업 모드로 실행되며 상단에 목업 안내가 표시됩니다.

- 관리자 계정: **admin / demo1234** (`/admin/login`)
- 접수 체험: `/w/mock-1` (다른 부스는 `mock-{부스 ID}`), 또는 관리자 부스 설정의 접수 링크
- 웨이팅 접수·취소·호출·입장·노쇼, 운영 설정, 콘텐츠 등록·수정·삭제, 알림 읽음 지원
- 데이터는 `localStorage['kufim.mock.v1']`, 데모 로그인은 `sessionStorage['kufim.mock.account']`에 저장됩니다. 새로고침해도 유지되고 다른 브라우저와 공유되지 않습니다.
- 입력한 학번·전화번호는 저장하지 않습니다. 관리자 연락처 조회에는 샘플 번호가 표시됩니다. 실제 문자 발송과 QR 이미지 생성 대신 접수 링크를 제공합니다.
- 초기화: 개발자 도구에서 `kufim.mock.v1`과 `kufim.mock.account` 키를 삭제하고 새로고침합니다. 처음 샘플 데이터를 만드는 날부터 2일의 공연 일정이 생성됩니다. 수정하지 않은 기존 3일 샘플 일정은 2일로 자동 변환되며, 직접 편집한 공연 일정은 유지됩니다.

### 실제 서버 연결하기

`.env.local`에 `VITE_USE_MOCK=false`를 지정하고 FE를 재시작하세요. 배포 빌드도 빌드 **전에** 이 값을 지정해야 실제 서버에 연결됩니다. 서버 오류가 나도 목업 데이터로 자동 전환하지 않습니다.

별도 터미널에서 BE를 실행합니다. 처음 관리자 계정을 만들 때만 원하는 개발용 계정을 환경변수로 지정합니다.

```sh
cd ../KUFIM-BE
export KUFIM_ADMIN_LOGIN=admin
export KUFIM_ADMIN_PASSWORD='직접-정한-개발용-비밀번호'
./gradlew bootRun
```

- 사용자: http://localhost:5173/
- 관리자 로그인: http://localhost:5173/admin/login
- BE Swagger: http://localhost:8080/swagger-ui.html

새 DB에는 콘텐츠가 없습니다. Swagger에서 관리자 로그인 후 축제 → 지도 도면(위치 지정 시 필요) → 무대를 먼저 등록하세요. 이후 FE 관리자 화면에서 공지, 공연, 부스, 시설을 등록할 수 있습니다. 부스 등록 시 **웨이팅 접수 사용**을 켜면 웨이팅 운영 목록에 표시됩니다. 기존 관리자 계정의 비밀번호는 환경변수로 덮어쓰지 않습니다.

## 요청한 폴더 구조

```text
src/
  apis/
    axios.ts                # baseURL, 쿠키·CSRF·방문자 토큰, 오류 처리
    type.ts                 # BE 요청·응답 타입
    adapters.ts             # BE 필드·enum ↔ 화면 표시 데이터
    mode.ts                 # 목업 / 실제 API 선택
    mock/                   # 샘플 데이터와 브라우저 내 API 처리
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

`.env.local`의 `VITE_API_BASE_URL`이 Axios 기본 주소입니다. 기본값은 `/api/v1`이며 Vite가 `/api`·`/ws` 요청을 `API_PROXY_TARGET`(기본 `http://127.0.0.1:8080`)으로 전달합니다. 환경변수를 바꾼 뒤에는 Vite를 재시작하세요.

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

내 대기표·부스 대기 현황·관리자 명단·공지는 STOMP(`/ws`) 이벤트를 받으면 기존 REST API로 다시 조회합니다. 로그인·세션 복원·로그아웃 시 소켓을 다시 연결해 현재 관리자 쿠키를 반영합니다. 연결 중에는 60초 안전망 조회를 유지하며, 연결이 끊기면 웨이팅·관리자 명단은 5초, 부스·공지는 15초 주기 조회로 돌아갑니다. 알림함은 기존 10초 주기 조회를 유지합니다. 목업 모드에서는 WebSocket에 연결하지 않습니다. 재시도 키는 접수 요청 및 호출 요청이 실패했을 때 같은 작업의 재시도에 재사용됩니다. 관리자 자동 취소 시간은 BE 정책에 따라 최초 호출 후 **10분 고정**으로 표시됩니다.

휴대폰 기본 카메라로 현장 QR을 스캔합니다. 웹 내부 카메라 인식은 구현하지 않았습니다. 문자 발송은 BE 공급자 연결 전까지 `NOT_CONFIGURED`이며 화면에서 이를 안내합니다. 축제·무대·첫 지도 도면·관리자 계정 관리는 기존 BE API/Swagger를 사용합니다.

## 검증

```sh
npm run build
npm run lint
npm test
npm run test:mock
```

`npm run test:mock`은 BE 없이 기본 화면·접수·호출·저장·새로고침 복원을 검증합니다.

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

`npm run build` 결과는 `dist/`입니다. 실제 운영 배포에서는 반드시 `VITE_USE_MOCK=false`를 설정한 상태로 빌드하세요. 운영 환경도 **FE와 같은 origin의 `/api`·`/ws` reverse proxy**를 사용하고 `/ws`의 WebSocket Upgrade를 지원해야 합니다. 정적 호스팅에서 `/ws`를 전달할 수 없다면 실시간 연결 없이 폴링으로 동작합니다. 현재 `vercel.json`은 SPA fallback만 설정하므로 배포 전에 실제 BE 주소로 `/api/:path*` 전달 규칙을 SPA fallback보다 앞에 추가해야 합니다. 운영 BE 주소가 정해지지 않아 임의의 외부 주소를 넣지는 않았습니다.

별도 origin의 절대 API 주소를 사용할 경우 BE CORS·세션 쿠키·CSRF 쿠키 접근 구성을 함께 맞춰야 합니다. API 호스트 전용 쿠키를 FE가 읽을 수 없는 배포에서는 `withCredentials`만 설정해도 CSRF 헤더가 생기지는 않습니다. 기본 same-origin proxy 구성을 사용하면 이를 피할 수 있습니다. 운영 QR의 `FRONTEND_BASE_URL`도 실제 FE 주소로 설정하세요.
