import { relations } from 'drizzle-orm'
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const serversTable = sqliteTable('servers', {
  id: text('id').primaryKey(),
  serverChannel: text('server_name').notNull(),
  serverRole: text('server_role').notNull()
})

export const serverBadgeRoles = sqliteTable('server_badge_roles', {
  id: text('id')
    .notNull()
    .references(() => serversTable.id),
  badge: text('badge').notNull(),
  roleId: text('role_id').notNull()
}, (t) => ({
  unq: unique().on(t.badge, t.roleId)
}))

export const serverBadgeRelations = relations(serversTable, ({ many }) => ({
  badges: many(serverBadgeRoles, {
    relationName: 'badgeRelations'
  })
}))

export const badgeServerRelations = relations(serverBadgeRoles, ({ one }) => ({
  server: one(serversTable, {
    fields: [serverBadgeRoles.id],
    references: [serversTable.id],
    relationName: 'badgeRelations'
  })
}))

export const userTable = sqliteTable('users', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  verified_at: integer('verified_at', { mode: 'timestamp' })
})
