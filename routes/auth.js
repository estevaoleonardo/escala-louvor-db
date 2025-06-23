// routes/auth.js (ATUALIZADO PARA O NOVO SCHEMA)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ROTA DE CADASTRO (SIMPLIFICADA PARA O NOVO SCHEMA)
router.post('/register', async (req, res) => {
    // Agora o cadastro só precisa dos dados básicos do usuário.
    // O 'email' é opcional no schema, então podemos dar um valor padrão ou tratar.
    const { name, username, password, email } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ message: 'Nome, username e senha são obrigatórios.' });
    }

    try {
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ username: username }, { email: email }] },
        });

        if (existingUser) {
            return res.status(409).json({ message: 'Username ou email já está em uso.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // A criação do usuário agora é mais simples, sem os instrumentos.
        const newUser = await prisma.user.create({
            data: {
                name,
                username,
                email,
                password: hashedPassword,
            },
        });

        res.status(201).json({ message: 'Usuário criado com sucesso!', userId: newUser.id });

    } catch (error) {
        console.error("Erro na rota de cadastro:", error);
        res.status(500).json({ message: 'Erro interno no servidor durante o cadastro.' });
    }
});


// ROTA DE LOGIN (SIMPLIFICADA PARA O NOVO SCHEMA)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username e senha são obrigatórios.' });
        }

        // A busca do usuário não inclui mais os instrumentos diretamente.
        const user = await prisma.user.findUnique({
            where: { username: username },
        });

        const isPasswordCorrect = user ? await bcrypt.compare(password, user.password) : false;

        if (!user || !isPasswordCorrect) {
            return res.status(401).json({ message: 'Credenciais inválidas!' });
        }

        const token = jwt.sign(
            { userId: user.id, username: user.username, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // A resposta não inclui mais a lista de instrumentos.
        res.status(200).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
            }
        });

    } catch (error) {
        console.error("Erro grave na rota de login:", error);
        res.status(500).json({ message: 'Ocorreu um erro interno no servidor.' });
    }
});

module.exports = router;