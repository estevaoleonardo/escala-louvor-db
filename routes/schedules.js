// routes/schedules.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkAuth, checkAdmin } = require('../middleware/checkAuth');

const router = express.Router();

// ====================================================================
// ROTA GET /api/schedules - Buscar todas as escalas
// ====================================================================
router.get('/', checkAuth, async (req, res) => {
    try {
        // Buscamos os dados com todos os 'includes' necessários, incluindo dados do usuário
        const schedules = await prisma.schedule.findMany({
            orderBy: { scheduleDate: 'desc' },
            include: {
                songs: true,
                participations: {
                    include: {
                        user: {
                            select: { id: true, name: true, username: true }
                        }
                    }
                },
                confirmations: {
                    include: {
                        user: {
                            select: { id: true, name: true, username: true }
                        }
                    }
                },
                changeRequests: {
                    include: {
                        user: {
                            select: { id: true, name: true, username: true }
                        }
                    }
                }
            },
        });
        // Enviamos os dados diretamente
        res.status(200).json(schedules);
    } catch (error) {
        console.error("Erro ao buscar escalas:", error);
        res.status(500).json({ message: 'Erro ao buscar escalas.', error: error.message });
    }
});

// ====================================================================
// ROTA POST /api/schedules - Criar nova escala
// ====================================================================
router.post('/', [checkAuth, checkAdmin], async (req, res) => {
    console.log("=========== NOVA REQUISIÇÃO DE CRIAÇÃO ===========");
    console.log("DADOS RECEBIDOS DO FRONTEND:", JSON.stringify(req.body, null, 2));
    const { scheduleDate, songs = [], participations: rawParticipations = [], cifras, paletaCores } = req.body;

    if (!scheduleDate) {
        return res.status(400).json({ message: 'A data da escala é obrigatória.' });
    }

    try {
        const validParticipations = rawParticipations
            .filter(p => p.userId)
            .map(p => ({
                userId: parseInt(p.userId, 10),
                instrument: p.instrument
            }))
            .filter(p => !isNaN(p.userId));

        console.log("PARTICIPAÇÕES VÁLIDAS PARA CRIAÇÃO:", JSON.stringify(validParticipations, null, 2));

        const newSchedule = await prisma.schedule.create({
            data: {
                scheduleDate: new Date(scheduleDate),
                cifras: cifras,
                paletaCores: paletaCores,
                songs: {
                    create: songs.map(s => ({ songName: s.songName, youtubeLink: s.youtubeLink }))
                },
                participations: {
                    create: validParticipations.map(p => ({
                        instrument: p.instrument,
                        user: { connect: { id: p.userId } }
                    }))
                }
            },
            include: { participations: { include: { user: true } }, songs: true }
        });

        console.log("ESCALA CRIADA COM SUCESSO NO BANCO:", JSON.stringify(newSchedule, null, 2));
        res.status(201).json(newSchedule);

    } catch (error) {
        console.error("!!!!!!!!!! ERRO AO CRIAR ESCALA NO BANCO !!!!!!!!!!", error);
        res.status(500).json({ message: 'Erro ao criar escala.', error: error.message, details: error.meta?.cause });
    }
});

// ====================================================================
// ROTA PUT /api/schedules/:id - Atualizar escala
// ====================================================================
router.put('/:id', [checkAuth, checkAdmin], async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ message: "ID da escala inválido." });

    const { scheduleDate, songs = [], participations: rawParticipations = [], cifras, paletaCores } = req.body;

    try {
        const updatedSchedule = await prisma.$transaction(async (tx) => {
            // Delete existing related records before creating new ones to avoid duplicates
            await tx.scheduleParticipation.deleteMany({ where: { scheduleId } });
            await tx.scheduleSong.deleteMany({ where: { scheduleId } });

            const validParticipations = rawParticipations.filter(p => p.userId).map(p => ({
                userId: parseInt(p.userId, 10),
                instrument: p.instrument
            })).filter(p => !isNaN(p.userId));

            return tx.schedule.update({
                where: { id: scheduleId },
                data: {
                    scheduleDate: new Date(scheduleDate),
                    cifras,
                    paletaCores,
                    songs: { create: songs.map(s => ({ songName: s.songName, youtubeLink: s.youtubeLink })) },
                    participations: {
                        create: validParticipations.map(p => ({
                            instrument: p.instrument,
                            user: { connect: { id: p.userId } }
                        }))
                    }
                },
                include: { participations: { include: { user: true } }, songs: true }
            });
        });
        res.status(200).json(updatedSchedule);
    } catch (error) {
        console.error("Erro ao atualizar escala:", error);
        res.status(500).json({ message: 'Erro ao atualizar escala.', error: error.message });
    }
});

// ====================================================================
// ROTA DELETE /api/schedules/:id - Deletar escala
// ====================================================================
router.delete('/:id', [checkAuth, checkAdmin], async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ message: "ID da escala inválido." });

    try {
        await prisma.schedule.delete({ where: { id: scheduleId } });
        res.status(204).send(); // No content to send back after successful deletion
    } catch (error) {
        console.error("Erro ao deletar escala:", error);
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Escala não encontrada." });
        }
        res.status(500).json({ message: "Erro interno ao deletar a escala." });
    }
});

// ====================================================================
// ROTA POST /api/schedules/:id/confirm - Músico confirma presença
// ====================================================================
router.post('/:id/confirm', checkAuth, async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ message: "ID da escala inválido." });

    const userId = req.userData.userId; // Assuming userId is available from checkAuth middleware
    try {
        await prisma.scheduleConfirmation.upsert({
            where: { scheduleId_userId: { scheduleId, userId } },
            update: {}, // No specific update needed if record exists, just ensure it's there
            create: { scheduleId, userId },
        });
        res.status(200).json({ message: 'Presença confirmada!' });
    } catch (error) {
        console.error("Erro ao confirmar presença:", error);
        res.status(500).json({ message: 'Erro ao confirmar presença.', error: error.message });
    }
});

// ====================================================================
// ROTA POST /api/schedules/:id/request-change - Músico solicita troca
// ====================================================================
router.post('/:id/request-change', checkAuth, async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ message: "ID da escala inválido." });

    const { reason } = req.body;
    if (!reason?.trim()) {
        return res.status(400).json({ message: "O motivo é obrigatório." });
    }

    const userId = req.userData.userId; // Assuming userId is available from checkAuth middleware
    try {
        await prisma.scheduleChangeRequest.upsert({
            where: { scheduleId_userId: { scheduleId, userId } },
            update: { reason: reason.trim(), resolved: false }, // Update reason and set resolved to false
            create: { scheduleId, userId, reason: reason.trim() }
        });
        res.status(200).json({ message: 'Solicitação de troca enviada!' });
    } catch (error) {
        console.error("Erro ao solicitar troca:", error);
        res.status(500).json({ message: 'Erro ao solicitar troca.', error: error.message });
    }
});

// ====================================================================
// ROTA DELETE /api/schedules/:id/confirm - Remover confirmação de presença
// ====================================================================
router.delete('/:id/confirm', checkAuth, async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ message: "ID da escala inválido." });

    const userId = req.userData.userId;
    const userRole = req.userData.role;

    try {
        // Busca a confirmação para saber quem a fez
        const confirmation = await prisma.scheduleConfirmation.findFirst({
            where: {
                scheduleId: scheduleId,
                userId: userId // Tenta encontrar a confirmação do usuário logado
            }
        });

        // Se o usuário não for admin e não for o dono da confirmação, nega a exclusão
        if (userRole !== 'admin' && !confirmation) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir esta confirmação.' });
        }

        // Se for admin, busca o userId da confirmação que está sendo excluída
        let targetUserId = userId;
        if (userRole === 'admin') {
            // O frontend precisa enviar o userId da confirmação como query parameter
            targetUserId = parseInt(req.query.userId, 10);
            if (isNaN(targetUserId)) {
                return res.status(400).json({ message: "ID do músico inválido." });
            }
        }

        // Exclui a confirmação
        const result = await prisma.scheduleConfirmation.deleteMany({
            where: {
                scheduleId: scheduleId,
                userId: targetUserId
            }
        });

        if (result.count === 0) {
            return res.status(404).json({ message: 'Confirmação não encontrada.' });
        }

        res.status(200).json({ message: 'Confirmação removida com sucesso!' });
    } catch (error) {
        console.error("Erro ao excluir confirmação:", error);
        res.status(500).json({ message: 'Erro ao excluir confirmação.', error: error.message });
    }
});

// ====================================================================
// ROTA DELETE /api/schedules - Deletar TODAS as escalas (CUIDADO!)
// ====================================================================
router.delete('/', [checkAuth, checkAdmin], async (req, res) => {
    try {
        await prisma.schedule.deleteMany({});
        res.status(200).json({ message: 'Todas as escalas foram excluídas.' });
    } catch (error) {
        console.error("Erro ao deletar todas as escalas:", error);
        res.status(500).json({ message: "Erro interno ao deletar as escalas." });
    }
});

module.exports = router;
