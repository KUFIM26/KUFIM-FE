# KUFIM

2026 건국대학교 가을대동제 ‘일감연’ 모바일 웹 UI입니다. 제공된 Figma의 31개 프레임을 React 페이지와 탭·모달·바텀시트 상태로 구성했습니다.

## 시작하기

Node.js 22.12 이상(또는 Vite에서 지원하는 Node.js 버전)이 필요합니다. 현재 작업 환경은 Node.js 22.13입니다.

```sh
cd /Users/kimdohyeon/Desktop/KUFIM
npm install
npm run dev
```

프로젝트는 아래 명령으로 생성했습니다.

```sh
npm create vite@latest . -- --template react-ts --no-interactive
```

- 사용자 홈: http://localhost:5173/
- 관리자 메뉴: http://localhost:5173/admin
- 전체 화면/상태 미리보기: http://localhost:5173/preview

React 19, TypeScript, Vite 8, Tailwind CSS 4의 Vite 플러그인, React Router 7을 사용합니다. Pretendard와 Figma 아이콘·지도는 로컬 파일로 제공하므로 임시 Figma URL에 의존하지 않습니다.

## 폴더 구성

```text
src/
  app/
    router.tsx          # 사용자·관리자 경로
    DemoProvider.tsx    # 데모 데이터 상태
    demo-context.ts     # 타입과 상태 접근 훅
  components/
    layout.tsx         # 모바일 레이아웃, 헤더, 하단 내비게이션
    ui.tsx             # 버튼, 탭, 필터, 다이얼로그
    festival.tsx       # 공연, 부스, 지도, 축제 카드
  data/
    mock.ts            # 백엔드 연결 전 예시 데이터
    screens.ts         # Figma 31개 프레임 ↔ URL 매핑
    figma-assets.ts    # 원본 에셋 경로
  pages/               # 영역별 페이지
  index.css            # Tailwind, 디자인 토큰, 공통 스타일
public/assets/figma/    # 원본 Figma SVG·지도 이미지
tests/                 # 화면·에셋·주요 이동 흐름 검증
```

## 라우팅

| 영역                           | 경로                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------- |
| 홈, 전체 메뉴                  | `/`, `/menu`                                                                     |
| 축제 지도, 지도 목록           | `/map`, `/map?view=list`                                                         |
| 부스·시설 목록                 | `/booths`, `/booths?period=facility`                                             |
| 부스 상세                      | `/booths/:id`                                                                    |
| 공연 일정·상세                 | `/performances`, `/performances/:id`                                             |
| 공지 목록·상세                 | `/notices`, `/notices/:id`                                                       |
| 알림함                         | `/notifications`                                                                 |
| 내 대기표                      | `/waiting`                                                                       |
| 대기표 활성·취소 확인 미리보기 | `/waiting?state=active`, `/waiting?state=cancel`                                 |
| QR 안내·접수                   | `/waiting/scan`, `/waiting/register/:boothId`                                    |
| QR 진입 (인쇄된 QR이 여는 주소) | `/w/:boothCode` — API 모드 전용                                                  |
| 관리자 로그인                  | `/admin/login` — API 모드 전용                                                   |
| 관리자 홈                      | `/admin`                                                                         |
| 공지 관리·등록·수정            | `/admin/notices`, `/admin/notices/new`, `/admin/notices/:id/edit`                |
| 공연 관리·등록·수정            | `/admin/performances`, `/admin/performances/new`, `/admin/performances/:id/edit` |
| 부스 관리·등록·수정            | `/admin/booths`, `/admin/booths/new`, `/admin/booths/:id/edit`                   |
| 시설 등록·위치 지정            | `/admin/booths/new?period=facility`, `/admin/booths/new?location=pick`           |
| 웨이팅 운영                    | `/admin/waiting`, `/admin/waiting/:boothId`                                      |
| 부스 설정                      | `/admin/waiting/:boothId/settings`                                               |
| 관리자 취소 확인 미리보기      | `/admin/waiting/booth-1?dialog=cancel`                                           |
| 보조 안내                      | `/guide`, `/report`                                                              |
| 화면 목록·로딩                 | `/preview`, `/loading`                                                           |

날짜·무대·부스 유형·카테고리는 검색 조건으로 관리합니다. 상세 페이지는 데이터 ID를 사용합니다. 공통 레이아웃 아래에 `/admin` 경로를 별도로 묶었습니다. 데스크톱에서는 모바일 화면을 393px 너비로 중앙 배치하고 작은 모바일 화면에서는 너비를 줄입니다.

## 이번 구현 범위

- Figma의 사용자·관리자 화면, 원본 SVG와 지도 이미지 적용
- 하단 메뉴, 상세 이동, 날짜/무대/카테고리 필터, 빈 상태
- QR 안내 → 접수 폼 → 대기표 → 취소 확인 흐름
- 관리자 공지·공연·부스의 등록 및 수정, 지도 위치 선택
- 부스 대기 명단, 호출 표시, 취소, 운영 상태와 시간 설정
- 다이얼로그 키보드 이동·Escape 닫기, 입력값 기본 검증

아래 내용은 기본값인 **mock 모드** 기준입니다. 백엔드 연결은 [백엔드 연결](#백엔드-연결)을 참고하세요.

모든 데이터 변경은 현재 브라우저 탭의 메모리에만 적용되며 새로고침하면 초기화됩니다. 학번·전화번호는 서버 전송이나 저장을 하지 않습니다. 실제 QR 카메라 인식, 문자·전화·푸시, 실시간 대기열, 지도 API, 관리자 인증은 연결하지 않았습니다. QR 스캔 화면의 미리보기 링크로 접수 화면에 진입할 수 있습니다. 부스 설정에 보이는 QR은 Figma의 원본 예시 이미지이며 운영용 QR 발급 기능이 아닙니다.

mock 모드의 관리자 경로는 인증 없는 UI 미리보기입니다. API 모드에서는 관리자 세션이 필요합니다.

Figma에 상세 화면이 없는 부스 상세·긴급 신고·이용 안내는 기존 카드 스타일을 사용하는 보조 화면입니다. 임시 문구 일부는 예시 문구로 정리했습니다. 공연 등록 디자인에 두 번 등장하는 ‘공연 소개’ 입력은 두 항목으로 유지했습니다. 행사 안내는 3일이지만 공연 탭은 원본처럼 DAY 1·DAY 2만 제공합니다.

## 백엔드 연결

`VITE_DATA_SOURCE=api`로 실행하면 [KUFIM-BE](../KUFIM-BE)의 `/api/v1`을 사용합니다. 기본값 `mock`은 위의 Figma 데모 데이터를 그대로 사용합니다.

```sh
cp .env.example .env.local   # VITE_DATA_SOURCE=api
# KUFIM-BE: ./gradlew bootRun (http://127.0.0.1:8080)
npm run dev
```

개발 서버와 `npm run preview`는 `/api`, `/ws`를 `VITE_API_PROXY_TARGET`(기본 `http://127.0.0.1:8080`)으로 프록시합니다. 브라우저 입장에서는 같은 출처이므로 CORS 설정 없이 동작하며, 같은 와이파이의 휴대폰에서 `http://PC-IP:5173`으로 접속해도 됩니다.

| 영역 | 연결 내용 |
|---|---|
| 공개 정보 | 축제·부스·시설·무대·공연·공지를 앱 시작 시 불러옵니다. 날짜 탭은 축제 기간, 무대 탭은 등록된 무대 순서를 따릅니다. 부스 상세는 소개와 대기 현황을 추가로 조회합니다. |
| 이용자 토큰 | 브라우저마다 UUID v4를 `localStorage`(`kufim.clientToken`)에 저장하고 `X-Client-Token`으로 보냅니다. 대기표 소유권과 알림이 이 토큰에 묶입니다. |
| 웨이팅 | `/w/:boothCode` → 활성 대기표가 있으면 `/waiting`, 없으면 접수 화면. 접수는 `Idempotency-Key`를 붙여 응답 유실 시에도 중복 접수되지 않습니다. 내 대기표는 10초마다, 부스 대기 현황은 10~15초마다 갱신합니다. |
| 알림함 | 호출·자동 취소 알림을 조회하고 읽음 처리합니다. |
| 관리자 | `/admin/*`는 세션(`KUFIMSESSION`)이 없으면 `/admin/login`으로 이동합니다. 쓰기 요청에는 로그인 시 발급된 `XSRF-TOKEN` 쿠키 값을 `X-XSRF-TOKEN`으로 보냅니다. 부스 관리자는 담당 부스만 볼 수 있습니다. |
| 웨이팅 운영 | 명단 5초 갱신, 호출·재호출(`Idempotency-Key`)·입장 완료·취소, 원본 연락처 조회(열람 기록이 남음), 운영 상태·팀당 예상 시간 저장, QR PNG 조회·저장·최초 발급 |

**배포:** 관리자 세션 쿠키는 `SameSite=Lax`이고 XSRF 쿠키는 FE에서 읽어야 하므로, API를 **FE와 같은 도메인의 `/api` 경로**로 제공해야 합니다. Vercel이라면 `vercel.json`의 SPA rewrite 앞에 `/api/:path*` → 백엔드 주소 rewrite를 추가하세요. 백엔드의 `FRONTEND_BASE_URL`은 QR에 인코딩될 FE 주소로 설정합니다.

**아직 API에 연결하지 않은 것:** 관리자 공지·공연·부스 등록/수정 폼(API 모드에서도 화면 메모리에만 반영), 지도 핀 표시, STOMP 실시간 구독(현재는 폴링), 긴급 신고.

## 검증

```sh
npm run build
npm run lint
npm test
```

`npm test`는 mock 모드 화면 테스트와, 브라우저 안에서 KUFIM-BE 응답을 흉내 내는 API 모드 테스트(`tests/api.spec.ts`)를 함께 실행합니다. 테스트를 처음 실행하는 환경에서는 `npx playwright install chromium`으로 브라우저를 설치하세요. 화면별 직접 접속, 이미지 로드·SVG 비율·가로 넘침, 웨이팅 접수와 취소, 관리자 저장 흐름을 검증합니다.

## 빌드와 배포

```sh
npm run build
npm run preview
```

배포 산출물은 `dist/`입니다. BrowserRouter를 사용하므로 정적 호스팅에서 존재하지 않는 파일 경로를 `/index.html`로 돌려주는 SPA fallback 설정이 필요합니다. 사이트 루트(`/`)에 배포하는 기본 구성입니다.

Vercel에서는 프로젝트 루트의 `vercel.json`이 `/admin` 등의 직접 접속과 새로고침을 처리합니다. Framework Preset은 `Vite`, Build Command는 `npm run build`, Output Directory는 `dist`를 사용하세요. 설정 파일을 추가하거나 수정한 경우 변경 내용을 포함한 새 배포가 필요합니다. Git 연동 배포라면 배포 대상 브랜치에 커밋하고 푸시하세요. 기존 커밋을 다시 배포하는 것만으로는 로컬의 변경 사항이 반영되지 않습니다.

`public/_redirects`는 이 파일을 지원하는 다른 호스트용 설정이며 Vercel 설정을 대신하지 않습니다. 참고: [Vercel의 Vite SPA 배포 안내](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

설정 참고: [Vite](https://vite.dev/guide/), [Tailwind Vite 설치](https://tailwindcss.com/docs/installation/using-vite), [React Router](https://reactrouter.com/start/declarative/installation)

디자인 원본: [KUFIM Figma](https://www.figma.com/design/0VwxRD0ybkDQjNagQF1Muw/KUFIM?node-id=0-1)
