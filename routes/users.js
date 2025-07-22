// routes/users.js
console.log("✅ Arquivo routes/users.js FOI CARREGADO COM SUCESSO!");

const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkAuth, checkAdmin } = require('../middleware/checkAuth');

const router = express.Router();

// =============================================================
// ROTA GET /api/users - Obter todos os usuários
// CORRIGIDO: Agora busca e inclui os instrumentos de cada músico.
// =============================================================
router.get('/', [checkAuth, checkAdmin], async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' },
            // Opcional: Filtra para trazer apenas usuários com o role 'musician'
            where: {
                role: 'musician'
            },
            // AQUI ESTÁ A REATIVAÇÃO: Inclui a lista de instrumentos de cada usuário
            include: {
                instruments: true,
            }
        });

        // Remove a senha de todos os usuários antes de enviar a resposta
        const usersWithoutPasswords = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.status(200).json(usersWithoutPasswords);

    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: 'Erro interno ao buscar a lista de usuários.', error: error.message });
    }
});


// =============================================================
// ROTA POST /api/users - Cadastrar novo usuário (músico)
// Cria o usuário e associa seus instrumentos em MAIÚSCULAS.
// =============================================================
router.post('/', [checkAuth, checkAdmin], async (req, res) => {
    const { name, email, username, password, instruments = [] } = req.body;

    // Validação de entrada
    if (!username || !password || !name || !email) {
        return res.status(400).json({ message: 'Nome, email, usuário e senha são obrigatórios.' });
    }
    if (!Array.isArray(instruments) || instruments.length === 0) {
        return res.status(400).json({ message: 'Pelo menos um instrumento deve ser selecionado.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Usa uma transação para garantir a consistência dos dados
        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    username,
                    password: hashedPassword,
                    role: 'musician'
                }
            });

            // Garante que os instrumentos sejam salvos em MAIÚSCULAS
            const instrumentData = instruments.map(inst => ({
                userId: user.id,
                instrument: inst.toUpperCase() 
            }));

            await tx.userInstrument.createMany({
                data: instrumentData
            });

            return user;
        });

        const { password: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);

    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'O e-mail ou nome de usuário fornecido já está em uso.' });
        }
        
        res.status(500).json({ message: 'Erro interno ao cadastrar usuário.', error: error.message });
    }
});


// =============================================================
// ROTA DELETE /api/users/:id - Deletar um usuário
// Converte o ID da URL para número antes de usar no Prisma.
// =============================================================
router.delete('/:id', [checkAuth, checkAdmin], async (req, res) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido." });
    }
    
    if (userId === req.userData.userId) {
        return res.status(403).json({ message: "Não é permitido se auto-deletar." });
    }

    try {
        await prisma.user.delete({
            where: {
              id: userId
            }
        });
        res.status(204).send();

    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        
        if (error.code === 'P2025') { 
            return res.status(404).json({ message: "Usuário não encontrado." });
        }
        
        res.status(500).json({ message: "Erro interno ao deletar usuário." });
    }
});


// ====================================================================
// ====================================================================
// ====================================================================
// ROTA PUT /api/users/:id - Atualizar um músico (VERSÃO CORRIGIDA E ROBUSTA)
// ====================================================================
router.put('/:id', checkAuth, async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    const { name, username, email, instruments, password } = req.body;

    if (!name || !username || !email) {
        return res.status(400).json({ message: 'Nome, usuário e email são obrigatórios.' });
    }

    try {
        // Usar uma transação é a abordagem mais segura aqui.
        const updatedUser = await prisma.$transaction(async (tx) => {
            // 1. Deletar TODAS as relações de instrumentos existentes para este usuário.
            //    Aqui usamos 'userInstrument' (camelCase), o nome correto do MODELO.
            await tx.userInstrument.deleteMany({
                where: {
                    userId: userId,
                },
            });

            // 2. Preparar os dados principais do usuário para a atualização.
            const userDataToUpdate = {
                name,
                username,
                email,
            };

            // 3. Se uma nova senha foi fornecida, faz o hash e a adiciona.
            if (password) {
                userDataToUpdate.password = await bcrypt.hash(password, 10);
            }

            // 4. Se novos instrumentos foram fornecidos, prepara-os para a criação.
            //    Isso é feito através de uma escrita aninhada 'create'.
            if (instruments && instruments.length > 0) {
                userDataToUpdate.instruments = {
                    create: instruments.map(instrumentName => ({
                        instrument: instrumentName, // Ex: 'GUITARRA'
                    })),
                };
            }

            // 5. Atualiza o usuário e (re)cria suas relações com instrumentos em uma única chamada.
            const user = await tx.user.update({
                where: { id: userId },
                data: userDataToUpdate,
                include: {
                    instruments: true, // Inclui os novos instrumentos na resposta
                },
            });

            return user;
        });

        res.json(updatedUser);

    } catch (error) {
        console.error('Erro ao atualizar músico:', error);
        if (error.code === 'P2025') { // Código do Prisma para "Registro não encontrado"
            return res.status(404).json({ message: `Músico com ID ${userId} não encontrado.` });
        }
        res.status(500).json({ message: 'Erro interno ao atualizar músico.' });
    }
});
module.exports = router;