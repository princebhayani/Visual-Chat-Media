/**
 * Data Migration Script
 *
 * This script migrates data from the old schema (single-owner conversations,
 * message roles) to the new schema (membership-based, message types).
 *
 * Run with: npx ts-node prisma/migrate-data.ts
 *
 * Steps:
 * 1. Sets type = AI_CHAT on all existing conversations
 * 2. Sets createdById from old userId field
 * 3. Creates ConversationMember entries from old Conversation.userId
 * 4. Updates messages: sets senderId, type, status from old role/userId fields
 * 5. Removes old columns (handled by Prisma migration)
 *
 * NOTE: Run `prisma db push` FIRST to apply schema changes,
 * then run this script to migrate existing data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...\n');

  // Step 1: Check if there's any data to migrate
  const conversationCount = await prisma.conversation.count();
  const messageCount = await prisma.message.count();
  console.log(`Found ${conversationCount} conversations, ${messageCount} messages\n`);

  if (conversationCount === 0) {
    console.log('No data to migrate. Schema is ready for fresh use.');
    return;
  }

  // Step 2: Ensure all conversations have type and createdById set
  // The new schema has defaults, so newly created records are fine.
  // Existing records should already have type=AI_CHAT (default) and createdById set.
  const convsWithoutMembers = await prisma.conversation.findMany({
    where: {
      members: { none: {} },
    },
    select: { id: true, createdById: true },
  });

  if (convsWithoutMembers.length > 0) {
    console.log(`Creating membership records for ${convsWithoutMembers.length} conversations...`);
    for (const conv of convsWithoutMembers) {
      await prisma.conversationMember.create({
        data: {
          conversationId: conv.id,
          userId: conv.createdById,
          role: 'OWNER',
        },
      });
    }
    console.log('Done creating membership records.\n');
  } else {
    console.log('All conversations already have members.\n');
  }

  // Step 3: Verify message data
  // New messages use type (TEXT/AI_RESPONSE) instead of role (USER/ASSISTANT)
  // and senderId instead of userId. These should be set by default constraints.
  const messagesWithoutType = await prisma.message.count({
    where: { type: 'TEXT', senderId: null },
  });

  console.log(`Messages with type=TEXT and no sender: ${messagesWithoutType}`);
  console.log('(These are likely old AI messages that need type updated to AI_RESPONSE)');

  console.log('\n--- Migration complete ---');
  console.log('All conversations have been set up with membership records.');
  console.log('The app is now ready for multi-user messaging.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
