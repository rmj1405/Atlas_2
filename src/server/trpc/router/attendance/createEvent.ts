import { protectedProcedure } from '~/server/trpc/trpc'
import { z } from 'zod'
import { toDataURL } from 'qrcode'
import { randomUUID } from 'crypto'
import { env } from '~/env/server.mjs'
import eventCollection from '~/server/db/collections/EventCollection'
import { Timestamp } from 'firebase/firestore'
import userCollection from '~/server/db/collections/UserCollection'
import type { Event } from '~/server/db/models/Event'

export const createEvent = protectedProcedure
  .input(
    z.object({
      name: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      departments: z.array(z.string()),
      attendees: z.array(z.string()),
      isQrRequired: z.boolean(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    try {
      let qr_code: string | undefined
      const id = randomUUID()

      if (input.isQrRequired) {
        qr_code = await toDataURL(`${env.DOMAIN}/events/${id}`)
      }

      const users = await Promise.all(
        input.attendees.map(async (attendee) => {
          const data = await userCollection.getById(attendee)
          console.log("The data is ", data)
          return { name: data.name || '', id: data.id as string }
        })
      )
      const payload: Event = {
        attendees: [],
        endDate: Timestamp.fromDate(input.endDate),
        hasStarted: false,
        id,
        invitedAttendees: users,
        name: input.name,
        startDate: Timestamp.fromDate(input.startDate),
        qrCode: qr_code || '',
      }

      await eventCollection.add(payload)
    } catch (e) {
      console.error('The error is ', (e as Error).message)
    }
  })
