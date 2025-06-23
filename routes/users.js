// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkAuth, checkAdmin } = require('../middleware/checkAuth');

const router = express.Router();

// =============================================================
// ROTA 1: Obter todos os usuários (GET /)
// CORREÇÃO: A consulta agora inclui a relação 'instruments'
// para que o frontend receba os instrumentos de cada músico.
// =============================================================
router.get('/', checkAuth, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            // 'include' é a chave para trazer os dados da tabela relacionada
            include: {
                instruments: true, // Isso trará um array de objetos de UserInstrument
            }
        });

        // Opcional mas recomendado: remover a senha antes de enviar
        const safeUsers = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.status(200).json(safeUsers);

    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: 'Erro interno ao buscar a lista de usuários.' });
    }
});


// =============================================================
// ROTA 2: Cadastrar novo usuário (POST /)
// CORREÇÃO: Esta é a correção principal. A rota agora lê o
// array 'instruments' e usa uma transação para criar o usuário
// e vincular seus instrumentos na tabela `UserInstrument`.
// =============================================================
router.post('/', [checkAuth, checkAdmin], async (req, res) => {
    // 1. Pegamos o array 'instruments' que o frontend envia
    const { name, username, email, password, role, instruments } = req.body;

    // 2. Adicionamos a validação para o array de instrumentos
    if (!name || !username || !email || !password || !Array.isArray(instruments) || instruments.length === 0) {
        return res.status(400).json({ message: 'Nome, username, email, senha e pelo menos um instrumento são obrigatórios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Usamos uma transação para garantir que tudo aconteça ou nada aconteça.
        const newUser = await prisma.$transaction(async (tx) => {
            // Passo A: Criar o usuário
            const user = await tx.user.create({
                data: {
                    name,
                    username,
                    email,
                    password: hashedPassword,
                    role: role || 'musician', 
                }
            });

            // Passo B: Preparar os dados para a tabela de junção (UserInstrument)
            const instrumentData = instruments.map(instrumentName => ({
                userId: user.id,          // Vincula ao ID do usuário recém-criado
                instrument: instrumentName, // O nome do instrumento (ex: "bateria")
            }));

            // Passo C: Inserir todos os vínculos de instrumento de uma vez
            await tx.userInstrument.createMany({
                data: instrumentData,
            });

            return user; // A transação retorna o usuário criado
        });
        
        // Retornamos o usuário recém-criado (sem a senha) para o frontend.
        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);

    } catch (error) {
        if (error.code === 'P2002') { // Erro de violação de chave única
            return res.status(409).json({ message: 'Nome de usuário ou email já existe.' });
        }
        console.error("Erro ao cadastrar usuário:", error);
        res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
    }
});


// =============================================================
// ROTA 3: Deletar usuário (DELETE /:id)
// NENHUMA MUDANÇA NECESSÁRIA. A exclusão em cascata do Prisma já cuida disso.
// =============================================================
router.delete('/:id', [checkAuth, checkAdmin], async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: id } });
        res.status(200).json({ message: 'Usuário deletado com sucesso.' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        console.error("Erro ao deletar usuário:", error);
        res.status(500).json({ message: 'Erro ao deletar usuário.' });
    }
});

module.exports = router;