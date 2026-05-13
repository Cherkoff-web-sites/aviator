export type SimulatorSplitVariant = 'text-left' | 'image-left'

export interface SimulatorContentSection {
  variant: SimulatorSplitVariant
  /** SVG 65×65 над заголовком, путь из public (например /assets/icons/...) */
  iconSrc?: string
  title: string
  paragraphs: string[]
  /** Маркированный список: маркер ok.svg 20×20, текст 16px */
  bulletPoints?: string[]
  /** Картинка справа/слева; контент страницы симулятора — файлы из /assets/simulator/ */
  image: string
}

export interface Simulator {
  slug: string
  title: string
  mobileButtonText: string
  /** Фон под h1 на странице тренажёра и слайд на главной (полноэкранное фото) */
  image: string
  pageHeading: string
  pageDescription: string
  /** Блок с галереей photo_sm_1–3 (тексты свои, фото общие) */
  photoSlider: {
    title: string
    description: string
    /** Ссылка «Посмотреть больше в Галерее» (после долистывания слайдера) */
    galleryTo: string
  }
  sections: SimulatorContentSection[]
}

/** Раскладка блоков на странице тренажёра: всегда 3 секции — текст слева, картинка слева, снова текст слева. */
export const SIMULATOR_PAGE_SECTION_VARIANTS: readonly SimulatorSplitVariant[] = [
  'text-left',
  'image-left',
  'text-left',
]

/** Иконки секций: 1 — rocket, 2 — samolet, 3 — people (одинаково на всех страницах тренажёров) */
const SECTION_ICONS = [
  '/assets/icons/rocket.svg',
  '/assets/icons/samolet.svg',
  '/assets/icons/people.svg',
] as const

export const simulators: Simulator[] = [
  {
    slug: 'mi-2',
    title: 'Ми-2',
    mobileButtonText: 'Тренажер Ми-2',
    image: '/assets/simulator/mi_2.webp',
    pageHeading: 'Ми-2',
    pageDescription:
      'Почувствуйте себя пилотом вертолёта в полноразмерном тренажёре. Реалистичная кабина, профессиональные инструкторы и незабываемые впечатления.',
    photoSlider: {
      title: 'Профессиональная запись полета',
      description:
        'HD-видео вашего полёта, включая работу приборов и ваши действия на органах управления — чтобы пересматривать, анализировать и делиться этой эмоцией.',
      galleryTo: '/gallery',
    },
    sections: [
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[0],
        title: 'О тренажёре',
        paragraphs: [
          'Тренажёр Ми-2 создан на основе реальной кабины и полностью повторяет конструкцию, приборы и управление вертолётом. Физическая модель полёта передаёт вибрации, реакции на рыскание, работу шаг-газ, влияние ветра и другие нюансы пилотирования лёгкого вертолёта.',
        ],
        image: '/assets/simulator/sm_4.webp',
      },
      {
        variant: 'image-left',
        iconSrc: '/assets/icons/vertolet.svg',
        title: 'Полноразмерная кабина Ми-2',
        paragraphs: [
          'Полноразмерная кабина Ми-2 — с оригинальными приборами, переключателями, системой управления. Визуальная система отображает полёт с различными погодными условиями, временем суток и рельефом местности.',
        ],
        bulletPoints: [
          'Полная симуляция приборов Ми-2',
          'Реалистичная динамика полёта лёгкого вертолёта',
          'Управление шаг-газом, педалями и ручкой циклического шага',
          '180° визуальная система',
        ],
        image: '/assets/simulator/sm_5.webp',
      },
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[2],
        title: 'Профессиональные инструкторы',
        paragraphs: [
          'Обучение проходит под руководством инструкторов с опытом реального пилотирования вертолётов.',
        ],
        bulletPoints: [
          'Реальные пилоты и сертифицированные инструкторы',
          'Индивидуальные занятия',
          'Пошаговый разбор ошибок после полёта',
          'Программы как для новичков, так и для профессионалов',
        ],
        image: '/assets/simulator/sm_6.webp',
      },
    ],
  },
  {
    slug: 'boeing-737',
    title: 'Boeing 737 NG',
    mobileButtonText: 'Тренажер Boeing 737NG',
    image: '/assets/simulator/boeing_737.webp',
    pageHeading: 'Boeing 737NG',
    pageDescription:
      'Почувствуйте себя настоящим пилотом в полноразмерном авиасимуляторе. Реалистичная кабина, профессиональные инструкторы и незабываемые впечатления.',
    photoSlider: {
      title: 'Погрузитесь в атмосферу Boeing 737NG',
      description: 'Посмотрите фото, видео и панораму кабины Boeing 737NG',
      galleryTo: '/gallery',
    },
    sections: [
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[0],
        title: 'Стань пилотом без сложного обучения и риска',
        paragraphs: [
          'Хочешь побывать за штурвалом настоящего пассажирского авиалайнера, увидеть взлетную полосу не из окна иллюминатора, а так, как ее видят пилоты?',
          'Авиатренажер Boeing 737NG позволит почувствовать себя настоящим пилотом воздушного авиалайнера!',
          'Благодаря особой конструкции кабины, использованию настоящего оборудования для ее оснащения, а также прекрасной визуализации ты сможешь полностью погрузиться в пилотирование',
        ],
        image: '/assets/simulator/sm_1.webp',
      },
      {
        variant: 'image-left',
        iconSrc: SECTION_ICONS[1],
        title: 'Полноразмерная кабина Boeing 737NG',
        paragraphs: [
          'Точная копия реальной кабины пилотов с оригинальными элементами управления',
        ],
        bulletPoints: [
          'Аутентичные панели приборов',
          'Настоящие переключатели и рычаги',
          'Полная имитация систем самолета',
          '180° визуальная система',
        ],
        image: '/assets/simulator/sm_2.webp',
      },
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[2],
        title: 'Профессиональные инструкторы',
        paragraphs: [
          'Опытные пилоты с многолетним стажем на реальных Boeing 737NG',
        ],
        bulletPoints: [
          'Сертифицированные инструкторы',
          'Опыт более 5000 летных часов',
          'Индивидуальный подход',
          'Понятные объяснения',
        ],
        image: '/assets/simulator/sm_3.webp',
      },
    ],
  },
  {
    slug: 'avia-school',
    title: 'Авиашкола',
    mobileButtonText: 'Авиашкола',
    image: '/assets/simulator/school.webp',
    pageHeading: 'Авиашкола',
    pageDescription:
      'Обучение пилотированию с нуля и повышение квалификации. Практика на тренажёрах, опытные преподаватели и современная программа.',
    photoSlider: {
      title: 'Видеозапись занятий на тренажёре',
      description:
        'Сохраняем ключевые фрагменты практики: положение приборов, манёвры и комментарии инструктора — чтобы возвращаться к разбору и видеть прогресс.',
      galleryTo: '/gallery',
    },
    sections: [
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[0],
        title: 'Стань пилотом без сложного обучения и риска',
        paragraphs: [
          'Хочешь попробовать себя в роли пилота и понять, твоё ли это? В нашей лётной школе ты проходишь обучение в максимально безопасной среде — на профессиональных тренажёрах и под присмотром опытных инструкторов. Уроки подойдут тем, кто мечтал о небе, но не решался сделать первый шаг. А мы гарантируем эмоции, которых точно не испытаешь на земле.',
        ],
        image: '/assets/simulator/sm_1.webp',
      },
      {
        variant: 'image-left',
        iconSrc: SECTION_ICONS[1],
        title: 'Полноразмерная кабина',
        paragraphs: ['Полноразмерная кабина самолёта — как в настоящем лайнере'],
        bulletPoints: [
          'Аутентичные приборы',
          'Воссозданная логика управления',
          'Полный набор кнопок и систем',
          'Реалистичное окружение и сценарии',
        ],
        image: '/assets/simulator/sm_2.webp',
      },
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[2],
        title: 'Профессиональные инструкторы',
        paragraphs: ['Опытные пилоты с многолетним стажем'],
        bulletPoints: [
          'Сертифицированные инструкторы',
          'Обучение 1-на-1 или в мини-группах',
          'Реалистичные сценарии полётов',
          'Понятные объяснения',
        ],
        image: '/assets/simulator/sm_3.webp',
      },
    ],
  },
]

for (const sim of simulators) {
  if (sim.sections.length !== SIMULATOR_PAGE_SECTION_VARIANTS.length) {
    throw new Error(
      `[simulators] «${sim.slug}»: ожидается ${SIMULATOR_PAGE_SECTION_VARIANTS.length} секции, сейчас ${sim.sections.length}.`,
    )
  }
  sim.sections.forEach((section, index) => {
    const expected = SIMULATOR_PAGE_SECTION_VARIANTS[index]
    if (section.variant !== expected) {
      throw new Error(
        `[simulators] «${sim.slug}», секция ${index + 1}: ожидается variant «${expected}», сейчас «${section.variant}».`,
      )
    }
  })
}

export function getSimulatorBySlug(slug: string | undefined): Simulator | undefined {
  if (!slug) return undefined
  return simulators.find((s) => s.slug === slug)
}
