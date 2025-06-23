const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando o script de seed...');

  // Usa uma senha padrão se não estiver definida no .env
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Senha para o admin foi criptografada.');

  // Usa 'upsert':
  // - Se um usuário com username 'admin' já existir, não faz nada (update: {}).
  // - Se não existir, cria o usuário com os dados abaixo.
  // Isso é mais seguro que deletar tudo sempre.
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      // CORREÇÃO: Adicionando o campo 'email' que estava faltando
      email: 'admin@email.com', 
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log(`Usuário administrador '${adminUser.username}' foi criado/verificado com sucesso.`);
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro no script de seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Script de seed finalizado.');
  });