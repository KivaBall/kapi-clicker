import { useEffect, useMemo, useRef, useState } from 'react'
import capibaraImage from './assets/capibara.png'

const STORAGE_KEY = 'kapi-clicker-state-v1'
const CAPYBARA_RAIN_COUNT = 14

const baseUpgrades = [
  {
    id: 'gentle-nudge',
    icon: '🤎',
    name: 'Gentle Nudge',
    description: '+1 treat per click',
    baseCost: 12,
    type: 'perClick',
    amount: 1,
    accentClass: 'bg-amber-50 hover:bg-amber-100',
    priceColor: 'text-amber-700',
  },
  {
    id: 'river-song',
    icon: '🌊',
    name: 'River Song',
    description: '+1 treat every second',
    baseCost: 45,
    type: 'auto',
    amount: 1,
    accentClass: 'bg-sky-50 hover:bg-sky-100',
    priceColor: 'text-sky-700',
  },
  {
    id: 'sunny-doze',
    icon: '☀️',
    name: 'Sunny Doze',
    description: '+3 treats per click',
    baseCost: 120,
    type: 'perClick',
    amount: 3,
    accentClass: 'bg-yellow-50 hover:bg-yellow-100',
    priceColor: 'text-yellow-700',
  },
  {
    id: 'family-gathering',
    icon: '🧺',
    name: 'Family Gathering',
    description: '+4 treats every second',
    baseCost: 320,
    type: 'auto',
    amount: 4,
    accentClass: 'bg-emerald-50 hover:bg-emerald-100',
    priceColor: 'text-emerald-700',
  },
  {
    id: 'marsh-melody',
    icon: '🎶',
    name: 'Marsh Melody',
    description: '+6 treats every second',
    baseCost: 640,
    type: 'auto',
    amount: 6,
    accentClass: 'bg-indigo-50 hover:bg-indigo-100',
    priceColor: 'text-indigo-700',
  },
  {
    id: 'herbal-snacks',
    icon: '🌿',
    name: 'Herbal Snacks',
    description: '+5 treats per click',
    baseCost: 950,
    type: 'perClick',
    amount: 5,
    accentClass: 'bg-lime-50 hover:bg-lime-100',
    priceColor: 'text-lime-700',
  },
  {
    id: 'twilight-lagoon',
    icon: '🌙',
    name: 'Twilight Lagoon',
    description: '+12 treats every second',
    baseCost: 1500,
    type: 'auto',
    amount: 12,
    accentClass: 'bg-purple-50 hover:bg-purple-100',
    priceColor: 'text-purple-700',
  },
  {
    id: 'lazy-brunch',
    icon: '🥗',
    name: 'Lazy Brunch',
    description: '+9 treats per click',
    baseCost: 2100,
    type: 'perClick',
    amount: 9,
    accentClass: 'bg-rose-50 hover:bg-rose-100',
    priceColor: 'text-rose-700',
  },
  {
    id: 'spa-day',
    icon: '🧖',
    name: 'Spa Day',
    description: '+18 treats every second',
    baseCost: 3200,
    type: 'auto',
    amount: 18,
    accentClass: 'bg-teal-50 hover:bg-teal-100',
    priceColor: 'text-teal-700',
  },
  {
    id: 'orchard-basket',
    icon: '🍎',
    name: 'Orchard Basket',
    description: '+14 treats per click',
    baseCost: 4800,
    type: 'perClick',
    amount: 14,
    accentClass: 'bg-orange-50 hover:bg-orange-100',
    priceColor: 'text-orange-700',
  },
]

const formatNumber = (value) => value.toLocaleString('en-US')

const createDefaultState = () => ({
  clicks: 0,
  treats: 0,
  perClick: 1,
  perSecond: 0,
  upgrades: baseUpgrades.map((upgrade) => ({
    ...upgrade,
    owned: 0,
    cost: upgrade.baseCost,
  })),
})

const deriveProductionFromUpgrades = (upgrades) =>
  upgrades.reduce(
    (accumulator, upgrade) => {
      if (upgrade.type === 'perClick') {
        accumulator.perClick += upgrade.amount * upgrade.owned
      }

      if (upgrade.type === 'auto') {
        accumulator.perSecond += upgrade.amount * upgrade.owned
      }

      return accumulator
    },
    { perClick: 1, perSecond: 0 },
  )

const mergeSavedState = (saved) => {
  const fallback = createDefaultState()
  if (!saved || typeof saved !== 'object') {
    return fallback
  }

  const savedUpgrades = Array.isArray(saved.upgrades) ? saved.upgrades : []
  const normalisedUpgrades = baseUpgrades.map((upgrade) => {
    const stored = savedUpgrades.find((item) => item.id === upgrade.id)
    const ownedCount = Number(stored?.owned)
    const storedCost = Number(stored?.cost)

    return {
      ...upgrade,
      owned: Number.isFinite(ownedCount) && ownedCount > 0 ? Math.floor(ownedCount) : 0,
      cost:
        Number.isFinite(storedCost) && storedCost >= upgrade.baseCost
          ? storedCost
          : upgrade.baseCost,
    }
  })

  const production = deriveProductionFromUpgrades(normalisedUpgrades)

  const safeNumber = (value, fallbackValue = 0) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallbackValue
    }
    return parsed
  }

  return {
    clicks: safeNumber(saved.clicks, fallback.clicks),
    treats: safeNumber(saved.treats, fallback.treats),
    perClick: production.perClick,
    perSecond: production.perSecond,
    upgrades: normalisedUpgrades,
  }
}

const useCapybaraAudio = () => {
  const audioMapRef = useRef({ click: null, purchase: null })

  useEffect(() => {
    if (typeof Audio === 'undefined') {
      return
    }

    const assetPath = (fileName) => `${import.meta.env.BASE_URL}sounds/${fileName}`

    const clickAudio = new Audio(assetPath('click.mp3'))
    const purchaseAudio = new Audio(assetPath('purchase.mp3'))
    clickAudio.volume = 0.5
    purchaseAudio.volume = 0.5

    audioMapRef.current = { click: clickAudio, purchase: purchaseAudio }

    return () => {
      audioMapRef.current = { click: null, purchase: null }
    }
  }, [])

  const play = (key) => {
    const audio = audioMapRef.current[key]
    if (!audio) {
      return
    }

    audio.currentTime = 0
    void audio.play().catch(() => {})
  }

  return { play }
}

const useCapybaraRainStyles = () => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined
    }

    const styleId = 'capybara-rain-keyframes'
    if (document.getElementById(styleId)) {
      return undefined
    }

    const styleElement = document.createElement('style')
    styleElement.id = styleId
    styleElement.textContent = `@keyframes capybara-fall {0% {transform: translateY(-120vh) scale(0.6);opacity: 0;}10% {opacity: 0.35;}90% {opacity: 0.35;}100% {transform: translateY(110vh) scale(1);opacity: 0;}}`
    document.head.appendChild(styleElement)

    return () => {
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement)
      }
    }
  }, [])
}

const CapybaraRain = ({ count }) => {
  useCapybaraRainStyles()

  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        const scale = 0.55 + Math.random() * 0.45
        const widthRem = 6 + scale * 6

        return {
          id: `capy-drop-${index}-${Math.random().toString(16).slice(2)}`,
          left: Math.random() * 100,
          delay: Math.random() * 10,
          duration: 9 + Math.random() * 6,
          scale,
          widthRem,
        }
      }),
    [count],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((drop) => (
        <img
          key={drop.id}
          src={capibaraImage}
          alt=""
          aria-hidden="true"
          className="absolute -top-40 opacity-0"
          style={{
            left: `calc(${drop.left}% - ${drop.widthRem / 2}rem)`,
            animation: `capybara-fall ${drop.duration}s linear infinite`,
            animationDelay: `-${drop.delay}s`,
            transform: `scale(${drop.scale})`,
            width: `${drop.widthRem}rem`,
          }}
        />
      ))}
    </div>
  )
}

function StatTile({ icon, label, value, accentClass }) {
  return (
    <div className={`rounded-md px-3 py-2 md:px-4 md:py-3 ${accentClass}`}>
      <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
        <span className="text-base" aria-hidden="true">
          {icon}
        </span>
        {label}
        <span className="text-base font-semibold text-slate-900 normal-case md:text-lg">
          {value}
        </span>
      </p>
    </div>
  )
}

function App() {
  const [gameState, setGameState] = useState(() => createDefaultState())
  const [isCapybaraPressed, setIsCapybaraPressed] = useState(false)
  const clickPulseTimeoutRef = useRef(null)
  const hasHydratedRef = useRef(false)
  const audioRefs = useCapybaraAudio()

  const { clicks, treats, perClick, perSecond, upgrades } = gameState

  useEffect(() => {
    if (perSecond <= 0) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        treats: prev.treats + prev.perSecond,
      }))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [perSecond])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setGameState(() => {
          const merged = mergeSavedState(parsed)
          hasHydratedRef.current = true
          return merged
        })
        return
      } catch (error) {
        console.warn('Failed to parse stored Kapi Clicker state', error)
      }
    }

    hasHydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
  }, [gameState])

  useEffect(
    () => () => {
      if (clickPulseTimeoutRef.current) {
        window.clearTimeout(clickPulseTimeoutRef.current)
      }
    },
    [],
  )

  const totalProduction = useMemo(
    () => ({
      perClick,
      perSecond,
    }),
    [perClick, perSecond],
  )

  const stats = useMemo(
    () => [
      {
        id: 'collected',
        icon: '🧺',
        label: 'Collected',
        value: formatNumber(treats),
        accentClass: 'bg-amber-50',
      },
      {
        id: 'clicks',
        icon: '🖱️',
        label: 'Clicks',
        value: formatNumber(clicks),
        accentClass: 'bg-sky-50',
      },
      {
        id: 'per-click',
        icon: '🐾',
        label: 'Per Click',
        value: formatNumber(totalProduction.perClick),
        accentClass: 'bg-emerald-50',
      },
      {
        id: 'per-second',
        icon: '⏱️',
        label: 'Per Second',
        value: formatNumber(totalProduction.perSecond),
        accentClass: 'bg-purple-50',
      },
    ],
    [clicks, totalProduction.perClick, totalProduction.perSecond, treats],
  )

  const handleCapybaraClick = () => {
    setGameState((prev) => ({
      ...prev,
      clicks: prev.clicks + 1,
      treats: prev.treats + prev.perClick,
    }))

    setIsCapybaraPressed(true)
    if (clickPulseTimeoutRef.current) {
      window.clearTimeout(clickPulseTimeoutRef.current)
    }
    clickPulseTimeoutRef.current = window.setTimeout(() => {
      setIsCapybaraPressed(false)
    }, 120)

    audioRefs.play('click')
  }

  const handlePurchase = (id) => {
    const upgradeSnapshot = upgrades.find((item) => item.id === id)
    if (!upgradeSnapshot) {
      return
    }

    if (treats < upgradeSnapshot.cost) {
      return
    }

    audioRefs.play('purchase')

    setGameState((prev) => {
      const index = prev.upgrades.findIndex((item) => item.id === id)
      if (index === -1) {
        return prev
      }

      const upgrade = prev.upgrades[index]
      if (prev.treats < upgrade.cost) {
        return prev
      }

      const updatedUpgrades = [...prev.upgrades]
      const nextCost = Math.ceil(upgrade.cost * 1.5)
      updatedUpgrades[index] = {
        ...upgrade,
        owned: upgrade.owned + 1,
        cost: nextCost,
      }

      return {
        ...prev,
        treats: prev.treats - upgrade.cost,
        perClick:
          upgrade.type === 'perClick'
            ? prev.perClick + upgrade.amount
            : prev.perClick,
        perSecond:
          upgrade.type === 'auto'
            ? prev.perSecond + upgrade.amount
            : prev.perSecond,
        upgrades: updatedUpgrades,
      }
    })
  }

  const visibleUpgrades = useMemo(
    () =>
      upgrades.filter((upgrade) =>
        upgrade.owned > 0 ? true : treats >= upgrade.baseCost,
      ),
    [upgrades, treats],
  )

  return (
    <div className="relative min-h-screen px-2 py-4 md:px-5 md:py-6">
      <CapybaraRain count={CAPYBARA_RAIN_COUNT} />
      <main className="relative z-10 flex min-h-[calc(100vh-3rem)] w-full flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
        <section className="flex w-full flex-1 min-h-0 flex-col gap-3 md:w-3/4">
          <div className="rounded-md bg-white px-4 py-4 md:px-5 md:py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <h1 className="text-3xl font-semibold text-slate-900 md:whitespace-nowrap">Kapi Clicker</h1>
              <div className="flex flex-1 flex-wrap gap-2 md:gap-3">
                {stats.map((stat) => (
                  <div key={stat.id} className="flex-1 min-w-[140px]">
                    <StatTile
                      icon={stat.icon}
                      label={stat.label}
                      value={stat.value}
                      accentClass={stat.accentClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden rounded-md bg-white px-3 py-3 md:px-4 md:py-4">
            <button
              type="button"
              onClick={handleCapybaraClick}
              aria-label="Click the capybara"
              className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-amber-50 hover:bg-amber-100 focus-visible:outline-none"
            >
              <img
                src={capibaraImage}
                alt="Capybara"
                className={`absolute inset-0 h-full w-full rounded-md object-cover transition-transform duration-150 ease-out ${
                  isCapybaraPressed ? 'scale-105' : 'scale-100'
                }`}
              />
            </button>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-3 md:w-1/4">
          <div className="rounded-md bg-white px-4 py-4 text-center md:px-5 md:py-5">
            <h2 className="text-lg font-semibold text-slate-900">🛠️ Upgrades</h2>
          </div>
          <div className="flex max-h-[calc(100vh-11rem)] flex-col gap-2 overflow-y-auto pr-1">
            {visibleUpgrades.map((upgrade) => (
              <button
                key={upgrade.id}
                type="button"
                onClick={() => handlePurchase(upgrade.id)}
                disabled={treats < upgrade.cost}
                className={`rounded-md px-4 py-3 text-left transition-colors ${upgrade.accentClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      <span aria-hidden="true" className="mr-2">
                        {upgrade.icon}
                      </span>
                      {upgrade.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{upgrade.description}</p>
                  </div>
                  <p className={`text-sm font-medium ${upgrade.priceColor}`}>
                    {formatNumber(upgrade.cost)}
                  </p>
                </div>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">
                  Owned: {upgrade.owned}
                </p>
              </button>
            ))}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
