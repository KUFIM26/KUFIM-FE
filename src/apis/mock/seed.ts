import type {
  BoothDto,
  FacilityDto,
  PerformanceDto,
  NoticeDto,
  Notification,
  WaitingTicket,
  WaitingConfig,
} from '../type'

export const MOCK_STORAGE_KEY = 'kufim.mock.v1'
export const MOCK_SESSION_KEY = 'kufim.mock.account'
export type MockTicket = WaitingTicket & { owner: string }
export type MockState = {
  booths: BoothDto[]
  facilities: FacilityDto[]
  performances: PerformanceDto[]
  notices: NoticeDto[]
  notifications: (Notification & { owner?: string })[]
  tickets: MockTicket[]
  configs: Record<number, WaitingConfig>
  requests: Record<string, string>
  startAt: string
  endAt: string
}
export function createSeed(): MockState {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
  const startAt = `${today}T09:00:00+09:00`
  const end = new Date(startAt)
  end.setDate(end.getDate() + 2)
  const last = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(end)
  const names = [
    '총학생회 간식 부스',
    '공과대학 야시장',
    '보드게임 동아리',
    '나만의 키링 만들기',
    '건국 포토존',
    '동아리 먹거리 장터',
  ]
  const booths: BoothDto[] = names.map((name, index) => ({
    boothId: index + 1,
    festivalId: 1,
    name,
    organizerType: (
      ['STUDENT_COUNCIL', 'COLLEGE', 'CLUB', 'INDIVIDUAL', 'UNIVERSITY', 'CLUB'] as const
    )[index],
    period: index === 1 || index === 5 ? 'NIGHT' : 'DAY',
    place: ['청심대', '공학관 앞', '학생회관', '일감호 산책로', '새천년관', '대운동장'][index],
    operatingHours: index === 1 || index === 5 ? '18:00~23:00' : '10:00~17:00',
    description: `${name}에서 축제를 즐겨보세요. 서버 없이 체험할 수 있는 샘플 부스입니다.`,
    waitingEnabled: index < 4,
    acceptingStatus: 'OPEN',
    waitingStatus: index < 4 ? 'OPEN' : 'DISABLED',
    pin: { xPercent: 25 + (index % 3) * 22, yPercent: 28 + Math.floor(index / 3) * 35 },
  }))
  const facilities: FacilityDto[] = (
    ['CONTROL_ROOM', 'RESTROOM', 'ALCOHOL_SALES', 'PHOTO_BOOTH', 'SMOKING_AREA'] as const
  ).map((type, index) => ({
    facilityId: index + 1,
    festivalId: 1,
    type,
    name: ['축제 종합상황실', '학생회관 화장실', '주류 판매소', '추억 포토부스', '지정 흡연구역'][
      index
    ],
    description: '축제 편의시설 안내입니다.',
    place: '학생회관 주변',
    operatingHours: '09:00~23:00',
    pin: { xPercent: 18 + index * 15, yPercent: 80 },
  }))
  const performances: PerformanceDto[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(startAt)
    date.setDate(date.getDate() + Math.floor(index / 2))
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)
    const hour = index % 2 ? 19 : 15
    return {
      performanceId: index + 1,
      festivalId: 1,
      stageId: (index % 2) + 1,
      stageName: index % 2 ? '일감호 무대' : '대운동장 무대',
      title: [
        '청춘 밴드 라이브',
        '댄스 동아리 쇼케이스',
        '어쿠스틱 콘서트',
        '초청 아티스트 공연',
        '학생 가요제',
        '축제 피날레',
      ][index],
      type: index % 2 ? 'DANCE' : 'BAND',
      startAt: `${day}T${hour}:00:00+09:00`,
      endAt: `${day}T${hour + 1}:00:00+09:00`,
      description: '함께 즐기는 건국대학교 축제 공연입니다.',
      additionalDescription: '시작 10분 전까지 입장해주세요.',
      castMembers: '건국대학교 학생 공연팀',
      setlist: '오프닝\n청춘의 노래\n앵콜',
    }
  })
  const notices: NoticeDto[] = [
    {
      noticeId: 1,
      title: '축제 이용 안내',
      content: '부스와 공연 일정을 확인하고 축제를 즐겨보세요. 현재 화면은 목업 데이터입니다.',
      category: 'INFO',
      publishedAt: startAt,
    },
    {
      noticeId: 2,
      title: '공연장 입장 안내',
      content: '공연 시작 10분 전부터 입장할 수 있습니다.',
      category: 'PERFORMANCE',
      publishedAt: startAt,
    },
    {
      noticeId: 3,
      title: '안전한 축제를 위한 안내',
      content: '혼잡한 구역에서는 안내 요원의 지시에 따라 이동해주세요.',
      category: 'SAFETY',
      publishedAt: startAt,
    },
  ]
  return {
    booths,
    facilities,
    performances,
    notices,
    tickets: [],
    requests: {},
    startAt,
    endAt: `${last}T23:00:00+09:00`,
    configs: Object.fromEntries(
      booths.map((b) => [
        b.boothId,
        {
          waitingEnabled: b.waitingEnabled,
          acceptingStatus: 'OPEN',
          estimateMinutesPerTeam: 5,
          autoCancelMinutes: 10,
        },
      ]),
    ),
    notifications: notices.map((n) => ({
      notificationId: n.noticeId,
      type: 'NOTICE',
      title: n.title,
      body: n.content,
      noticeId: n.noticeId,
      waitingId: null,
      createdAt: n.publishedAt,
      readAt: null,
    })),
  }
}
