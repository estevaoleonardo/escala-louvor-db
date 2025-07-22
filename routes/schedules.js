// routes/schedules.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { checkAuth, checkAdmin } = require('../middleware/checkAuth');

const router = express.Router();

/// ====================================================================
// ROTA GET /api/schedules - CORRIGIDA
// ====================================================================
router.get('/', checkAuth, async (req, res) => {
    try {
        // Apenas buscamos os dados com todos os 'includes' necessários
        const schedules = await prisma.schedule.findMany({
            orderBy: { scheduleDate: 'desc' }, // ou 'asc', como preferir
            include: {
                songs: true,
                participations: {
                    include: {
                        user: {
                            select: { id: true, name: true, username: true } 
                        }
                    }
                },
                confirmations: true, // Pode precisar disso para outras lógicas
                changeRequests: true // Pode precisar disso para outras lógicas
            },
        });

        // E enviamos os dados DIRETAMENTE, sem transformá-los.
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

        // A CORREÇÃO ESTÁ AQUI
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
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao deletar escala:", error);
        if (error.code === 'P2025') return res.status(404).json({ message: "Escala não encontrada." });
        res.status(500).json({ message: "Erro interno ao deletar a escala." });
    }
});


// ====================================================================
// ROTA POST /api/schedules/:id/confirm - Músico confirma presença
// ====================================================================
router.post('/:id/confirm', checkAuth, async (req, res) => {
    const scheduleId = parseInt(req.params.id, 10);
    if (isNaN(scheduleId)) return res.status(400).json({ message: "ID da escala inválido." });
    
    const userId = req.userData.userId;
    try {
        await prisma.scheduleConfirmation.upsert({
            where: { scheduleId_userId: { scheduleId, userId } },
            update: {},
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
    if (!reason?.trim()) return res.status(400).json({ message: "O motivo é obrigatório." });

    const userId = req.userData.userId;
    try {
        await prisma.scheduleChangeRequest.upsert({
            where: { scheduleId_userId: { scheduleId, userId } },
            update: { reason: reason.trim(), resolved: false },
            create: { scheduleId, userId, reason: reason.trim() }
        });
        res.status(200).json({ message: 'Solicitação de troca enviada!' });
    } catch (error) {
        console.error("Erro ao solicitar troca:", error);
        res.status(500).json({ message: 'Erro ao solicitar troca.', error: error.message });
    }
});

module.exports = router;