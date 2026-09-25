export type Booth = {
  id: string
  name: string
  category: string
  period: 'day' | 'night' | 'facility'
  place: string
  hours: string
  description: string
  teams?: number
  minutes?: number
  position?: { x: number; y: number }
}
export type Performance = {
  id: string
  name: string
  day: string
  stage: string
  time: string
  end: string
  place: string
  kind: string
  status?: 'past' | 'now' | 'next'
  description: string
  additionalDescription?: string
  cast: string
  setlist: string
}
export type Notice = {
  id: string
  title: string
  category: string
  date: string
  body: string
  unread?: boolean
  notificationUnread?: boolean
}
export const boothCategories = ['전체', '총학생회', '단과대학', '동아리', '개인', '학교본부']
export const facilities = ['상황실', '화장실', '주류판매', '포토부스', '흡연구역']
export const noticeCategories = ['전체', '공연', '안전', '교통', '안내']
export const boothSeed: Booth[] = [
  ...['인연', '필연', '우연'].map((name, i): Booth => ({
    id: `booth-${i + 1}`,
    name: `총학생회 - 부스${i + 1} ‘${name}'`,
    category: '총학생회',
    period: 'day',
    place: '청심대',
    hours: '10:00~17:00',
    description: '당신의 인연을 찾아보세요.',
    teams: 12,
    minutes: 60,
  })),
  {
    id: 'night-1',
    name: '총학생회 - 야간 부스',
    category: '총학생회',
    period: 'night',
    place: '청심대',
    hours: '18:00~25:00',
    description: '일감연의 밤을 함께 즐겨보세요.',
    teams: 12,
    minutes: 60,
  },
  {
    id: 'facility-1',
    name: '공학관 화장실',
    category: '화장실',
    period: 'facility',
    place: '공학관A동',
    hours: '24시간',
    description: '공학관 A동에 위치한 화장실입니다.',
  },
  {
    id: 'facility-2',
    name: '인문학관 화장실',
    category: '화장실',
    period: 'facility',
    place: '청심대',
    hours: '10:00~17:00',
    description: '행사 시간 중 이용할 수 있습니다.',
  },
  {
    id: 'facility-3',
    name: '제1학생회관 포토부스',
    category: '포토부스',
    period: 'facility',
    place: '제1학생회관 앞',
    hours: '24시간',
    description: '축제의 추억을 사진으로 남겨보세요.',
  },
]
export const performanceSeed: Performance[] = ['1', '2'].flatMap((day) =>
  ['main', 'sub'].flatMap((stage) =>
    ['10:00', '12:00', '14:00', '16:00', '18:00'].map((time, i): Performance => ({
      id: `performance-${day}-${stage}-${i + 1}`,
      name: `밴드${i ? ' ' : ''}${i + 1}`,
      day,
      stage,
      time,
      end: `${String(Number(time.slice(0, 2)) + 2).padStart(2, '0')}:00`,
      place: stage === 'main' ? '노천극장' : '황소상 서브무대',
      kind: '밴드',
      status:
        day === '1'
          ? i === 0
            ? 'past'
            : i === 1
              ? 'now'
              : i === 2
                ? 'next'
                : undefined
          : undefined,
      description:
        '건국대학교 유일 정책동아리 옥슨이 준비하는 무대입니다. 파워풀한 보컬과 재미있는 공연으로 축제를 함께 즐겨보세요.',
      cast: '보컬 000, 기타 000, 베이스 000, 드럼 000',
      setlist: '오프닝\n첫 번째 곡\n두 번째 곡\n세 번째 곡\n앵콜',
    })),
  ),
)
export const noticeSeed: Notice[] = [
  {
    id: 'urgent',
    category: '긴급',
    title: '우천으로 인한 야간 부스 운영 시간 조정 안내',
    date: '09.30. 18:32',
    body: '우천으로 야간 부스 운영 시간이 조정됩니다. 현장 안내와 추가 공지를 확인해주세요.',
    unread: true,
  },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `notice-${i + 1}`,
    category: '교통',
    title: '주차장 혼잡 - 대중교통 이용 권장',
    date: '09.30. 14:00',
    body: '행사 기간 중 주차장이 혼잡합니다.\n대중교통을 이용해주시고 이동 시 안전에 유의해주세요.',
    unread: i === 0,
    notificationUnread: i < 2,
  })),
]
export const queueSeed = [
  {
    id: '12',
    boothId: 'booth-1',
    people: 3,
    student: '202300012',
    phone: '010-1234-1234',
    elapsed: 23,
    called: true,
  },
  {
    id: '13',
    boothId: 'booth-1',
    people: 2,
    student: '202300012',
    phone: '010-1234-1234',
    elapsed: 3,
    called: false,
  },
]
