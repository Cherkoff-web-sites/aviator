import ContentSplitSectionLight from '../components/ContentSplitSectionLight'
import GalleryGradientSplitSection from '../components/GalleryGradientSplitSection'
import GalleryMediaPanel from '../components/GalleryMediaPanel'
import SiteCtaBanner from '../components/SiteCtaBanner'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

const GALLERY_BOEING_COPY = [
  'Забудьте о роли пассажира — здесь вы становитесь главной силой, поднимающей в небо легенду мировой авиации. Пилотирование Boeing 737 — это сочетание железной выдержки и филигранной точности: от оглушительного рева двигателей на взлете до сложнейшего захода на посадку в условиях грозы. Попробуйте укротить строптивый характер многотонного лайнера при боковом ветре или доверьтесь совершенной авионике, прокладывая маршрут через океаны. Это не просто симулятор, это ваш пропуск в мир большой авиации, где каждое решение имеет значение, а драйв от касания полосы остается с вами навсегда.',
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
  'Укротите легенду винтокрылой авиации. Забудьте о длинных взлетных полосах — здесь небо начинается прямо под вами. Пилотирование вертолета — это высший пилотаж координации, где задействованы и руки, и ноги, и интуиция. Попробуйте удержать многотонную машину в режиме «висения» или совершить ювелирную посадку на крошечную площадку. Ми-2 не просто тренажер, это характер, который проверит вас на прочность и подарит ни с чем не сравнимый драйв свободного полета в любом направлении.',
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

/* Авиашкола — временно скрыто
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
*/

function GalleryPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col pb-12 pt-[96px] text-white min-[990px]:pb-16 min-[990px]:pt-[112px]">
        <div className="container-app pb-6 min-[990px]:pb-10">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight min-[990px]:text-[36px] min-[990px]:leading-[1.15]">
            Галерея
          </h1>
        </div>
        <ContentSplitSectionLight
          variant="text-left"
          title="Boeing 737: Возьмите под контроль 70 тонн чистой энергии"
          paragraphs={[...GALLERY_BOEING_COPY]}
          media={<GalleryMediaPanel slides={[...BOEING_GALLERY_SLIDES]} />}
        />
        <GalleryGradientSplitSection
          title="Ми-2"
          paragraphs={[...GALLERY_MI2_COPY]}
          media={<GalleryMediaPanel theme="dark" slides={[...MI2_GALLERY_SLIDES]} />}
        />
        {/* Авиашкола — временно скрыто
        <ContentSplitSectionLight
          variant="text-left"
          title="Авиашкола"
          titleUppercase={false}
          paragraphs={[...GALLERY_SCHOOL_COPY]}
          media={<GalleryMediaPanel slides={[...SCHOOL_GALLERY_SLIDES]} />}
        />
        */}
      </main>
      <SiteCtaBanner />
      <SiteFooter />
    </div>
  )
}

export default GalleryPage
