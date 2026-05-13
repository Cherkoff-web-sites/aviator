import ContentSplitSectionLight from '../components/ContentSplitSectionLight'
import GalleryGradientSplitSection from '../components/GalleryGradientSplitSection'
import GalleryMediaPanel from '../components/GalleryMediaPanel'
import PageGradientTitle from '../components/PageGradientTitle'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

const GALLERY_BOEING_COPY = [
  'Хочешь побывать за штурвалом настоящего пассажирского авиалайнера, увидеть взлетную полосу не из окна иллюминатора, а так, как ее видят пилоты?',
  'Авиатренажер Boeing 737NG позволит почувствовать себя настоящим пилотом воздушного авиалайнера!',
  'Благодаря особой конструкции кабины, использованию настоящего оборудования для ее оснащения, а также прекрасной визуализации ты сможешь полностью погрузиться в пилотирование',
  'А ещё полеты на авиасимуляторе очень часто помогают побороть аэрофобию!',
]

const BOEING_GALLERY_SLIDES = [
  {
    src: '/assets/simulator/sm_1.webp',
    alt: 'Кабина Boeing 737NG',
    badge360OnThumb: true,
  },
  { src: '/assets/simulator/sm_2.webp', alt: 'Панель приборов Boeing 737NG' },
  { src: '/assets/simulator/sm_3.webp', alt: 'Boeing 737NG, вид из кабины' },
  { src: '/assets/simulator/boeing_737.webp', alt: 'Авиатренажёр Boeing 737NG' },
] as const

const GALLERY_MI2_COPY = [
  'Ознакомьтесь с нашим авиатренажером, созданным на базе вертолета Ми-2. Тренажер представляет собой точную копию кабины легендарного советского вертолета.',
  'Кабина оснащена рабочими местами двух пилотов с полным комплектом органов управления и приборной панели. Воссозданы все основные системы вертолета, включая управление двигателем и несущим винтом.',
  'Тренажер используется для обучения основам пилотирования, отработки стандартных процедур и ознакомления с особенностями управления вертолетом.',
  'Доступны различные режимы работы — от ознакомительных полетов до специализированных программ обучения.',
  'Визуальная система обеспечивает обзор из кабины с реалистичной прорисовкой окружающей обстановки. Возможна имитация различных метеоусловий и времени суток.',
  'Тренажер подходит как для начальной подготовки пилотов, так и для поддержания навыков управления вертолетом.',
]

const MI2_GALLERY_SLIDES = [
  { src: '/assets/simulator/sm_4.webp', alt: 'Тренажёр Ми-2' },
  { src: '/assets/simulator/sm_5.webp', alt: 'Кабина вертолёта Ми-2' },
  { src: '/assets/simulator/sm_6.webp', alt: 'Ми-2, приборная панель' },
  {
    src: '/assets/simulator/mi_2.webp',
    alt: 'Авиатренажёр Ми-2',
    badge360OnThumb: true,
  },
] as const

const GALLERY_SCHOOL_COPY = [
  'Профессиональная подготовка пилотов на современных авиатренажёрах — от первых шагов до уверенного управления воздушным судном.',
  'Вы занимаетесь на оборудовании, максимально приближённом к реальным кабинам: те же приборы, сценарии и логика работы систем, что и в настоящем полёте.',
  'Опытные инструкторы сопровождают вас на каждом этапе: от брифинга до разбора после занятия, с акцентом на безопасность и понятную обратную связь.',
  'Доступны программы начальной подготовки, повышения квалификации и тематические модули — расписание и формат можно подстроить под ваши цели.',
]

const SCHOOL_GALLERY_SLIDES = [
  { src: '/assets/simulator/sm_1.webp', alt: 'Лётная школа, тренажёр' },
  { src: '/assets/simulator/sm_2.webp', alt: 'Кабина для обучения' },
  { src: '/assets/simulator/sm_3.webp', alt: 'Занятие на тренажёре' },
  { src: '/assets/simulator/school.webp', alt: 'Авиашкола' },
] as const

function GalleryPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col bg-[#e9e9e9] pb-12 pt-[72px] min-[990px]:pb-16 min-[990px]:pt-[84px]">
        <PageGradientTitle title="Галерея" className="pb-6 min-[990px]:pb-10" />
        <ContentSplitSectionLight
          variant="text-left"
          title="Boeing 737NG"
          paragraphs={[...GALLERY_BOEING_COPY]}
          media={<GalleryMediaPanel slides={[...BOEING_GALLERY_SLIDES]} />}
        />
        <GalleryGradientSplitSection
          title="Ми-2"
          paragraphs={[...GALLERY_MI2_COPY]}
          media={<GalleryMediaPanel theme="dark" slides={[...MI2_GALLERY_SLIDES]} />}
        />
        <ContentSplitSectionLight
          variant="text-left"
          title="Авиашкола"
          titleUppercase={false}
          paragraphs={[...GALLERY_SCHOOL_COPY]}
          media={<GalleryMediaPanel slides={[...SCHOOL_GALLERY_SLIDES]} />}
        />
      </main>
      <SiteFooter />
    </div>
  )
}

export default GalleryPage
