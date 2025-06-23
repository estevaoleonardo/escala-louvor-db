// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkAuth, checkAdmin } = require('../middleware/checkAuth');

const router = express.Router();

// =============================================================
// ROTA 1: Obter todos os usuários (GET /)
// CORREÇÃO: Esta é a rota que estava causando o erro 500.
// Ela foi simplificada para apenas buscar os usuários sem tentar
// incluir relações que não existem mais diretamente no modelo User.
// =============================================================
router.get('/', checkAuth, async (req, res) => {
    try {
        // Agora buscamos todos os usuários, independentemente da função,
        // e selecionamos apenas os campos seguros para enviar ao frontend.
        // A filtragem por 'musician' pode ser feita no frontend se necessário.
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
            }
        });

        res.status(200).json(users);

    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: 'Erro interno ao buscar a lista de usuários.' });
    }
});


// =============================================================
// ROTA 2: Cadastrar novo usuário (POST /)
// CORREÇÃO: O cadastro de um usuário agora é independente de
// seus instrumentos. Instrumentos são associados a um usuário
// DENTRO de uma escala (Schedule), não no momento do cadastro.
// =============================================================
router.post('/', [checkAuth, checkAdmin], async (req, res) => {
    // O corpo da requisição agora só precisa dos dados do usuário.
    const { name, username, email, password, role } = req.body;

    if (!name || !username || !email || !password) {
        return res.status(400).json({ message: 'Nome, username, email e senha são obrigatórios.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await prisma.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
                // O role pode ser 'admin' ou 'musician', vindo do corpo da requisição.
                // Se não for fornecido, o padrão do schema ('musician') será usado.
                role: role || 'musician', 
            },
            // Seleciona os dados do usuário recém-criado para retornar, excluindo a senha.
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                role: true,
            }
        });
        
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: newUser });

    } catch (error) {
        if (error.code === 'P2002') { // Erro de violação de chave única
            return res.status(409).json({ message: 'Username ou email já existe.' });
        }
        console.error("Erro ao cadastrar usuário:", error);
        res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
    }
});


// =============================================================
// ROTA 3: Deletar usuário (DELETE /:id)
// CORREÇÃO: Esta rota já estava funcional, pois a exclusão
// em cascata é gerenciada pelo Prisma. Apenas adicionamos um
// log de erro melhor para depuração.
// =============================================================
router.delete('/:id', [checkAuth, checkAdmin], async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: id } });
        res.status(200).json({ message: 'Usuário deletado com sucesso.' });
    } catch (error) {
        if (error.code === 'P2025') { // Registro não encontrado para deletar
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        console.error("Erro ao deletar usuário:", error);
        res.status(500).json({ message: 'Erro ao deletar usuário.' });
    }
});

module.exports = router;