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

export interface SimulatorPricingPlan {
  durationLabel: string
  /** Как на макете, напр. «170 BYN» */
  priceDisplay: string
  /** Текст между разделителями (например «Базовый минимум») */
  ribbon?: string
  highlighted?: boolean
  /** Пункты тарифа; если нет — берутся features блока */
  features?: string[]
}

export interface SimulatorPricingBlock {
  /** Фон секции (размытие + затемнение поверх) */
  backgroundImage: string
  headingIcon: string
  headingTitle: string
  headingSubtitle: string
  features: string[]
  plans: SimulatorPricingPlan[]
}

export interface SimulatorHighlight {
  iconSrc: string
  title: string
  description: string
}

export interface Simulator {
  slug: string
  title: string
  mobileButtonText: string
  /** Фон под h1 на странице тренажёра и слайд на главной (полноэкранное фото) */
  image: string
  pageHeading: string
  pageDescription: string
  /** CTA «Новые эмоции…» — заголовок над кнопкой брони */
  ctaTitle: string
  highlights: SimulatorHighlight[]
  /** Блок «Профессиональная запись…» — свои тексты и 3 фото */
  photoSlider: {
    title: string
    description: string
    /** Три кадра слайдера (пути из public) */
    images: [string, string, string]
    /** Ссылка «Посмотреть больше в Галерее» (после долистывания слайдера) */
    galleryTo: string
  }
  pricingBlock: SimulatorPricingBlock
  sections: SimulatorContentSection[]
}

/** Раскладка блоков на странице тренажёра: всегда 3 секции — текст слева, картинка слева, снова текст слева. */
export const SIMULATOR_PAGE_SECTION_VARIANTS: readonly SimulatorSplitVariant[] = [
  'text-left',
  'image-left',
  'text-left',
] as const

/** Иконки секций: 1 — rocket, 2 — samolet, 3 — people (одинаково на всех страницах тренажёров) */
const SECTION_ICONS = [
  '/assets/icons/rocket.svg',
  '/assets/icons/samolet.svg',
  '/assets/icons/people.svg',
] as const

const HIGHLIGHT_ICONS = {
  check: '/assets/icons/icon_check.svg',
  scenarios: '/assets/icons/icon_scenarios.svg',
  equipment: '/assets/icons/icon_equipment.svg',
} as const

const MI2_HIGHLIGHTS: SimulatorHighlight[] = [
  {
    iconSrc: HIGHLIGHT_ICONS.check,
    title: 'Профессиональная подготовка',
    description: 'Возможность отработки стандартных и нестандартных процедур',
  },
  {
    iconSrc: HIGHLIGHT_ICONS.scenarios,
    title: 'Разнообразные сценарии',
    description: 'Любая точка земного шара и реалистичные погодные условия по всему миру',
  },
  {
    iconSrc: HIGHLIGHT_ICONS.equipment,
    title: 'Современное оборудование',
    description: 'Новейшие технологии для максимальной реалистичности',
  },
]

const BOEING_HIGHLIGHTS: SimulatorHighlight[] = [
  {
    iconSrc: HIGHLIGHT_ICONS.check,
    title: 'Профессиональная подготовка',
    description: 'Возможность отработки стандартных и нестандартных процедур',
  },
  {
    iconSrc: HIGHLIGHT_ICONS.scenarios,
    title: 'Разнообразные сценарии',
    description: 'Любой аэропорт мира',
  },
  {
    iconSrc: HIGHLIGHT_ICONS.equipment,
    title: 'Современное оборудование',
    description: 'Новейшие технологии для максимальной реалистичности',
  },
]

const SCHOOL_HIGHLIGHTS: SimulatorHighlight[] = [
  {
    iconSrc: HIGHLIGHT_ICONS.check,
    title: 'Профессиональная подготовка',
    description: 'Возможность отработки стандартных и нестандартных процедур',
  },
  {
    iconSrc: HIGHLIGHT_ICONS.scenarios,
    title: 'Разнообразные сценарии',
    description: 'Более 100 аэропортов и реалистичные погодные условия по всему миру',
  },
  {
    iconSrc: HIGHLIGHT_ICONS.equipment,
    title: 'Современное оборудование',
    description: 'Новейшие технологии для максимальной реалистичности',
  },
]

const SCHOOL_PRICING_FEATURES = [
  'Учебные материалы',
  'Практика на тренажёре',
  'Обратная связь от инструктора',
  'Гибкий график',
  'Сертификат по запросу',
] as const

export const simulators: Simulator[] = [
  {
    slug: 'mi-2',
    title: 'Ми-2',
    mobileButtonText: 'Тренажер Ми-2',
    image: '/assets/simulator/mi_2.webp',
    pageHeading: 'Ми-2',
    pageDescription:
      'Легендарный Ми-2 в формате полноразмерного авиатренажёра.',
    ctaTitle: 'Ваше приключение начинается здесь',
    highlights: MI2_HIGHLIGHTS,
    photoSlider: {
      title: 'Профессиональная запись полета',
      description: 'В кабине разрешена фото- и видеосъемка.',
      images: [
        '/assets/simulator/photo_sm_mi2_1.png',
        '/assets/simulator/photo_sm_mi2_2.png',
        '/assets/simulator/photo_sm_mi2_3.png',
      ],
      galleryTo: '/gallery',
    },
    pricingBlock: {
      backgroundImage: '/assets/simulator/sm_price_2.webp',
      headingIcon: '/assets/icons/vertolet.svg',
      headingTitle: 'Авиатренажер Ми-2',
      headingSubtitle:
        'К самостоятельному управлению допускаются взрослые и дети с 10 лет',
      features: [],
      plans: [
        {
          durationLabel: '30 минут',
          priceDisplay: '170 BYN',
          ribbon: 'Идеально для первого знакомства с авиатренажером',
          features: [
            'Знакомство с кабиной и инструктаж (3-5 мин)',
            'Любая локация земного шара без привязки к аэропортам',
            '2 пассажира',
            'Возможна отработка нештатных ситуаций',
            'Фото- и видеосъемка',
          ],
        },
        {
          durationLabel: '60 минут',
          priceDisplay: '300 BYN',
          highlighted: true,
          ribbon: 'Полноценный полет',
          features: [
            'Инструктаж (5-10 мин) и запуск вертолета с «холодной прокрутки»',
            'Несколько локаций земного шара',
            '2 пассажира',
            'Отработка «зависания» в воздухе',
            'Возможна отработка нештатных ситуаций',
            'Фото- и видеосъемка',
          ],
        },
      ],
    },
    sections: [
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[0],
        title: 'О тренажёре',
        paragraphs: [
          'В основе нашего симулятора — подлинная кабина легендарного Ми-2. Это не копия, а настоящий фюзеляж с оригинальными приборами, тумблерами и рычагами управления. Каждое ваше действие вызывает мгновенный отклик системы, а передовая визуализация стирает грань между реальностью и графикой. Выбирайте свой маршрут: от заснеженных горных пиков до мегаполисов, залитых огнями ночного города.',
        ],
        image: '/assets/simulator/sm_4.webp',
      },
      {
        variant: 'image-left',
        iconSrc: '/assets/icons/vertolet.svg',
        title: 'Полноразмерная кабина Ми-2',
        paragraphs: [
          'Почувствуйте металл и вес реального управления. Мы сохранили каждую деталь кабины Ми-2, чтобы вы могли ощутить себя настоящим пилотом.',
        ],
        bulletPoints: [
          'Полностью закрытая кабина отсекает внешний мир, обеспечивая 100% погружение в атмосферу полёта.',
          'Точная математическая модель передаёт каждое движение, поведение и реакцию вертолёта в воздухе.',
          'Профессиональная панорамная визуализация и объёмный звук создают полную иллюзию реального полета.',
          'Уникальная возможность почувствовать себя пилотом вертолета, а также отработать любые нештатные ситуации — от отказа систем до экстремальных погодных условий.',
        ],
        image: '/assets/simulator/sm_5.webp',
      },
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[2],
        title: 'Профессиональные инструкторы',
        paragraphs: [
          'Забудьте о сухой теории. Осуществите полет под руководством действующих пилотов и сертифицированных инструкторов, имеющих за плечами тысячи часов реального налёта.',
        ],
        bulletPoints: [
          'Летайте с профессионалами, которые знают вертолет изнутри.',
          'Каждый полет проходит в индивидуальном формате.',
          'Понятный инструктаж и сопровождение на протяжении всего полета',
          'Адаптивные программы — от первого знакомства с кабиной до отработки сложных навыков для профессионалов.',
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
      'Почувствуйте мощь Boeing 737: профессиональный авиатренажер мирового бестселлера авиации.',
    ctaTitle: 'Кресло капитана ждет тебя',
    highlights: BOEING_HIGHLIGHTS,
    photoSlider: {
      title: 'Погрузитесь в атмосферу Boeing 737NG',
      description: '',
      images: [
        '/assets/simulator/photo_sm_1.webp',
        '/assets/simulator/photo_sm_2.webp',
        '/assets/simulator/photo_sm_3.webp',
      ],
      galleryTo: '/gallery',
    },
    pricingBlock: {
      backgroundImage: '/assets/simulator/sm_price_1.webp',
      headingIcon: '/assets/icons/samolet.svg',
      headingTitle: 'Авиатренажер Boeing 737',
      headingSubtitle:
        'К самостоятельному управлению допускаются взрослые и дети с 8 лет',
      features: [],
      plans: [
        {
          durationLabel: '30 минут',
          priceDisplay: '170 BYN',
          ribbon: 'Ознакомительный полет',
          features: [
            'Знакомство с кабиной и инструктаж (3-5 мин)',
            'Любой аэропорт мира и погода',
            '4 пассажира',
            'Возможна отработка нештатных ситуаций',
            'Фото- и видеосъемка',
          ],
        },
        {
          durationLabel: '60 минут',
          priceDisplay: '300 BYN',
          ribbon: 'Полноценный полет',
          features: [
            'Инструктаж (7-15 мин) с запуском двигателей',
            'Любой аэропорт мира и погода',
            '4 пассажира',
            'Возможна отработка нештатных ситуаций',
            'Фото- и видеосъемка',
          ],
        },
        {
          durationLabel: '90 минут',
          priceDisplay: '400 BYN',
          highlighted: true,
          ribbon: 'Для ценителей авиации',
          features: [
            'Знакомство с оборудованием',
            'Запуск двигателей, руление к ВВП',
            'Любой аэропорт мира и погода',
            '4 пассажира',
            'Возможна отработка нештатных ситуаций',
            'Фото- и видеосъемка',
          ],
        },
        {
          durationLabel: '120 минут',
          priceDisplay: '450 BYN',
          ribbon: 'Для настоящих фанатов',
          features: [
            'Полноценное выполнение рейса со всеми процедурами',
            'Любой аэропорт мира и погода',
            '4 пассажира',
            'Возможна отработка нештатных ситуаций',
            'Фото- и видеосъемка',
          ],
        },
      ],
    },
    sections: [
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[0],
        title: 'Ваш первый рейс в кресле капитана.',
        paragraphs: [
          'Мечтали увидеть мир глазами пилота, а не через узкое окно иллюминатора? С Boeing 737NG границы стираются.',
          'Никаких долгих теорий и рисков — только вы, штурвал и бесконечное небо.',
        ],
        image: '/assets/simulator/sm_1.webp',
      },
      {
        variant: 'image-left',
        iconSrc: SECTION_ICONS[1],
        title: 'Полноразмерная кабина Boeing 737NG',
        paragraphs: [
          'Мы воссоздали рабочее место пилота с абсолютной точностью, чтобы ничто не отвлекало вас от полета.',
        ],
        bulletPoints: [
          'Полностью закрытое пространство кабины гарантирует изоляцию от внешнего шума и взглядов, позволяя полностью сосредоточиться на управлении.',
          'Оригинальные рычаги, тумблеры и панели. Каждая кнопка выполняет свою реальную функцию.',
          'Панорамный обзор 180° формирует глубокое ощущение полета, при котором каждый маневр и крен воспринимаются всем телом.',
          'Интеллектуальная имитация всех систем и авионики в точности повторяет логику работы самого массового лайнера в мире.',
        ],
        image: '/assets/simulator/sm_2.webp',
      },
      {
        variant: 'text-left',
        iconSrc: SECTION_ICONS[2],
        title: 'Профессиональные инструкторы',
        paragraphs: [],
        bulletPoints: [
          'Вашим вторым пилотом станет эксперт с колоссальным опытом — более 5000 часов налета за штурвалом реального Boeing 737NG.',
          'Программа полета выстраивается индивидуально, исходя из ваших пожеланий и уровня подготовки.',
          'Сложные технические нюансы и системы самолета объясняются простым и понятным языком, доступным даже новичку',
          'По желанию, возможна отработка нештатных ситуаций в неблагоприятных погодных условиях.',
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
    ctaTitle: 'Новые эмоции рядом',
    highlights: SCHOOL_HIGHLIGHTS,
    photoSlider: {
      title: 'Видеозапись занятий на тренажёре',
      description:
        'Сохраняем ключевые фрагменты практики: положение приборов, манёвры и комментарии инструктора — чтобы возвращаться к разбору и видеть прогресс.',
      images: [
        '/assets/simulator/photo_sm_1.webp',
        '/assets/simulator/photo_sm_2.webp',
        '/assets/simulator/photo_sm_3.webp',
      ],
      galleryTo: '/gallery',
    },
    pricingBlock: {
      backgroundImage: '/assets/simulator/school.webp',
      headingIcon: '/assets/icons/people.svg',
      headingTitle: 'Авиашкола',
      headingSubtitle: 'Обучение и практика на профессиональных тренажёрах',
      features: [...SCHOOL_PRICING_FEATURES],
      plans: [
        { durationLabel: '1 занятие', priceDisplay: '150 BYN', ribbon: 'Базовый минимум' },
        { durationLabel: '4 занятия', priceDisplay: '520 BYN', ribbon: 'Базовый минимум' },
        {
          durationLabel: '8 занятий',
          priceDisplay: '960 BYN',
          highlighted: true,
          ribbon: 'Базовый минимум',
        },
        { durationLabel: '12 занятий', priceDisplay: '1320 BYN', ribbon: 'Базовый минимум' },
      ],
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

/** Блок «Полёт 2в1» на странице Цены (30 мин Boeing + 30 мин Ми-2). */
export const COMBO_PRICING_BLOCK: SimulatorPricingBlock = {
  backgroundImage: '/assets/simulator/sm_price_2.webp',
  headingIcon: '/assets/icons/rocket.svg',
  headingTitle: 'Полёт 2в1',
  headingSubtitle: '30 минут самолёт + 30 минут вертолёт — один сертификат',
  features: [],
  plans: [
    {
      durationLabel: '60 минут',
      priceDisplay: '370 BYN',
      highlighted: true,
      ribbon: '30 мин Boeing 737NG + 30 мин Ми-2',
      features: [
        '30 минут на Boeing 737NG',
        '30 минут на вертолёте Ми-2',
        'Инструктаж на каждом тренажёре',
        'Фото- и видеосъемка',
      ],
    },
  ],
}

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
