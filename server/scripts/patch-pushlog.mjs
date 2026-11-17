import fs from 'node:fs'

const p = new URL('../src/routes/api.ts', import.meta.url)
let s = fs.readFileSync(p, 'utf8')

const patches = [
  {
    find: `meta: { bookingId: booking.id, date: booking.date },
    })
  })

  console.log(\`[BOOKING CODE]`,
    insert: `meta: { bookingId: booking.id, date: booking.date },
    })
    pushLog(s, {
      message: \`Бронь с сайта: \${booking.name} · \${booking.date} \${booking.startTime}\`,
      context: 'booking',
      meta: { bookingId: booking.id },
    })
  })

  console.log(\`[BOOKING CODE]`,
  },
  {
    find: `title: 'Новая бронь 2в1 с сайта',
      body: \`\${name} · \${date} \${startTime}+\${secondStart} · Boeing+Ми-2\`,
      href: notifHref('/admin', bookings[0].id, { date }),
      meta: { bookingId: bookings[0].id, date, comboGroupId },
    })
  })`,
    insert: `title: 'Новая бронь 2в1 с сайта',
      body: \`\${name} · \${date} \${startTime}+\${secondStart} · Boeing+Ми-2\`,
      href: notifHref('/admin', bookings[0].id, { date }),
      meta: { bookingId: bookings[0].id, date, comboGroupId },
    })
    pushLog(s, {
      message: \`Бронь 2в1 с сайта: \${name} · \${date} \${startTime}\`,
      context: 'booking',
      meta: { bookingId: bookings[0].id },
    })
  })`,
  },
  {
    find: `title: 'Новая запись в админке',
        body: \`\${booking.name} · \${booking.date} \${booking.startTime} · \${simLabel}\`,
        href: notifHref('/admin', booking.id, { date: booking.date }),
        meta: { bookingId: booking.id, date: booking.date },
      })
    }
  })
  broadcast()
  res.status(201).json(booking)`,
    insert: `title: 'Новая запись в админке',
        body: \`\${booking.name} · \${booking.date} \${booking.startTime} · \${simLabel}\`,
        href: notifHref('/admin', booking.id, { date: booking.date }),
        meta: { bookingId: booking.id, date: booking.date },
      })
      pushLog(s, {
        message: \`Запись создана в админке: \${booking.name} · \${booking.date} \${booking.startTime}\`,
        context: 'booking',
        meta: { bookingId: booking.id },
      })
    }
  })
  broadcast()
  res.status(201).json(booking)`,
  },
]

let ok = 0
for (const { find, insert } of patches) {
  if (!s.includes(find)) {
    console.error('MISS patch', find.slice(0, 80))
    continue
  }
  s = s.replace(find, insert)
  ok++
}

// PATCH booking — log after Object.assign success path inside updateStore is hard;
// add after broadcast for patch when updated
const patchNeedle = `  if (rejected) {
    res.status(400).json({ error: 'Для Ми-2 максимальная длительность — 60 минут' })
    return
  }
  broadcast()
  res.json(updated)
})`
if (s.includes(patchNeedle) && !s.includes('Запись изменена в админке')) {
  s = s.replace(
    patchNeedle,
    `  if (rejected) {
    res.status(400).json({ error: 'Для Ми-2 максимальная длительность — 60 минут' })
    return
  }
  if (updated) {
    const u = updated
    await updateStore((s) => {
      pushLog(s, {
        message: \`Запись изменена: \${u.name} · \${u.date} \${u.startTime} → \${u.status}\`,
        context: 'booking',
        meta: { bookingId: u.id, status: u.status },
      })
    })
  }
  broadcast()
  res.json(updated)
})`,
  )
  ok++
}

// DELETE booking
const delNeedle = `    s.bookings = s.bookings.filter((b) => b.id !== id)
  })
  broadcast()
  res.json({ ok: true, archived })
})`
if (s.includes(delNeedle) && !s.includes('Запись удалена:')) {
  s = s.replace(
    delNeedle,
    `    s.bookings = s.bookings.filter((b) => b.id !== id)
    if (prev) {
      pushLog(s, {
        message: \`Запись удалена: \${prev.name} · \${prev.date} \${prev.startTime}\`,
        context: 'booking',
        meta: { bookingId: prev.id },
      })
    }
  })
  broadcast()
  res.json({ ok: true, archived })
})`,
  )
  ok++
}

fs.writeFileSync(p, s)
console.log('applied', ok)
