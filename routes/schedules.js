// routes/schedules.js

const express = require('express');
const { PrismaClient, Instrument } = require('@prisma/client'); // Importa o Enum 'Instrument'
const prisma = new PrismaClient();
const { checkAuth, checkAdmin } = require('../middleware/checkAuth');

const router = express.Router();


// ===================================
// Obter todas as escalas
// GET /api/schedules
// ===================================
router.get('/', checkAuth, async (req, res) => {
    try {
        const schedules = await prisma.schedule.findMany({
            orderBy: { scheduleDate: 'desc' },
            include: {
                // Inclui os dados das tabelas relacionadas
                participations: {
                    include: {
                        user: {
                            select: { id: true, name: true } // Pega só o ID e nome do usuário
                        }
                    }
                },
                songs: true,
                confirmations: {
                    include: {
                        user: {
                            select: { id: true, name: true }
                        }
                    }
                },
                changeRequests: {
                     include: {
                        user: {
                            select: { id: true, name: true }
                        }
                    }
                }
            },
        });
        res.status(200).json(schedules);
    } catch (error) {
        console.error("Erro ao buscar escalas:", error);
        res.status(500).json({ message: 'Erro ao buscar escalas.', error: error.message });
    }
});


// ===================================
// Criar nova escala
// POST /api/schedules
// ===================================
router.post('/', [checkAuth, checkAdmin], async (req, res) => {
    // A requisição agora espera 'scheduleDate', 'songs' e 'participations'
    const { scheduleDate, songs = [], participations = [], cifras } = req.body;

    if (!scheduleDate) {
        return res.status(400).json({ message: 'A data da escala é obrigatória.' });
    }

    try {
        const newSchedule = await prisma.schedule.create({
            data: {
                scheduleDate: new Date(scheduleDate),
                cifras: cifras,
                // Prisma cria os registros relacionados em uma única transação
                songs: {
                    create: songs.map(song => ({
                        songName: song.songName,
                        youtubeLink: song.youtubeLink
                    }))
                },
                participations: {
                    create: participations.map(p => ({
                        userId: p.userId,
                        instrument: p.instrument // O valor aqui deve ser um dos enums, ex: "bateria"
                    }))
                }
            }
        });
        res.status(201).json({ message: 'Escala criada com sucesso!', schedule: newSchedule });
    } catch (error) {
        console.error("Erro ao criar escala:", error);
        res.status(500).json({ message: 'Erro ao criar escala.', error: error.message });
    }
});


// ===================================
// Atualizar escala
// PUT /api/schedules/:id
// ===================================
router.put('/:id', [checkAuth, checkAdmin], async (req, res) => {
    const { id } = req.params;
    const { scheduleDate, songs = [], participations = [], cifras } = req.body;

    try {
        // Usamos uma transação para garantir que tudo seja feito de uma vez
        const updatedSchedule = await prisma.$transaction(async (tx) => {
            // 1. Deleta as participações e músicas antigas
            await tx.scheduleParticipation.deleteMany({ where: { scheduleId: id } });
            await tx.scheduleSong.deleteMany({ where: { scheduleId: id } });

            // 2. Atualiza os dados principais e recria as participações e músicas
            const schedule = await tx.schedule.update({
                where: { id },
                data: {
                    scheduleDate: new Date(scheduleDate),
                    cifras: cifras,
                    songs: {
                        create: songs.map(song => ({
                            songName: song.songName,
                            youtubeLink: song.youtubeLink
                        }))
                    },
                    participations: {
                        create: participations.map(p => ({
                            userId: p.userId,
                            instrument: p.instrument
                        }))
                    }
                }
            });
            return schedule;
        });

        res.status(200).json({ message: 'Escala atualizada com sucesso!', schedule: updatedSchedule });
    } catch (error) {
        console.error("Erro ao atualizar escala:", error);
        res.status(500).json({ message: 'Erro ao atualizar escala.', error: error.message });
    }
});


// ===================================
// Deletar escala
// DELETE /api/schedules/:id
// ===================================
router.delete('/:id', [checkAuth, checkAdmin], async (req, res) => {
    try {
        await prisma.schedule.delete({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Escala deletada com sucesso.' });
    } catch (error) {
        console.error("Erro ao deletar escala:", error);
        res.status(500).json({ message: 'Erro ao deletar escala.', error: error.message });
    }
});


// ===================================
// Músico confirma presença
// POST /api/schedules/:id/confirm
// ===================================
router.post('/:id/confirm', checkAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.userData.userId; // Agora usamos o ID do usuário, que é mais seguro

    try {
        // 'upsert' cria se não existir, ou não faz nada se já existir. Perfeito para confirmação.
        await prisma.scheduleConfirmation.upsert({
            where: { scheduleId_userId: { scheduleId: id, userId: userId } },
            update: {},
            create: { scheduleId: id, userId: userId },
        });
        res.status(200).json({ message: 'Presença confirmada!' });
    } catch (error) {
        console.error("Erro ao confirmar presença:", error);
        res.status(500).json({ message: 'Erro ao confirmar presença.', error: error.message });
    }
});


// ===================================
// Músico solicita troca
// POST /api/schedules/:id/request-change
// ===================================
router.post('/:id/request-change', checkAuth, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userData.userId; // Usamos o ID do usuário

    try {
        // Primeiro deletamos qualquer solicitação antiga do mesmo usuário para a mesma escala
        await prisma.scheduleChangeRequest.deleteMany({ where: { scheduleId: id, userId: userId } });
        
        // Criamos a nova solicitação
        await prisma.scheduleChangeRequest.create({
            data: { scheduleId: id, userId: userId, reason: reason }
        });
        res.status(200).json({ message: 'Solicitação de troca enviada!' });
    } catch (error) {
        console.error("Erro ao solicitar troca:", error);
        res.status(500).json({ message: 'Erro ao solicitar troca.', error: error.message });
    }
});

module.exports = router;