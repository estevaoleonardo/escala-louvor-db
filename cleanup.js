// cleanup.js (versão completa para encontrar e deletar)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    // Encontra os órfãos primeiro
    const orphaned = await prisma.$queryRaw`
      SELECT sp.schedule_id, sp.user_id, sp.instrument
      FROM \`schedule_participations\` AS sp
      LEFT JOIN \`users\` AS u ON sp.user_id = u.id
      WHERE u.id IS NULL;
    `;

    if (orphaned.length === 0) {
      console.log('Nenhuma participação órfã encontrada. O banco de dados parece consistente.');
      return;
    }

    console.log('Encontradas as seguintes participações órfãs para deletar:');
    console.log(orphaned);

    // Deleta os registros órfãos
    // Como a chave é composta, temos que iterar
    for (const p of orphaned) {
      await prisma.scheduleParticipation.delete({
        where: {
          scheduleId_userId_instrument: {
            scheduleId: p.schedule_id,
            userId: p.user_id,
            instrument: p.instrument,
          },
        },
      });
      console.log(`Deletado: scheduleId=${p.schedule_id}, userId=${p.user_id}, instrument=${p.instrument}`);
    }

    console.log('Limpeza concluída com sucesso!');

  } catch (error) {
    console.error('Erro durante a limpeza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();