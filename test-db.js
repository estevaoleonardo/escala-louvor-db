// test-db.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
    console.log('Tentando conectar ao banco de dados...');
    try {
        // O comando $connect() tenta estabelecer uma conexão.
        await prisma.$connect();
        console.log('✅ Conexão com o banco de dados MySQL bem-sucedida!');
    } catch (error) {
        console.error('❌ FALHA AO CONECTAR AO BANCO DE DADOS!');
        console.error('Verifique os seguintes pontos:');
        console.error('1. O servidor MySQL está rodando?');
        console.error('2. O arquivo .env está com o usuário, senha, host e nome do banco corretos?');
        console.error('3. O nome do banco de dados "verbo_louvor_zn" existe no seu MySQL?');
        console.error('-------------------');
        console.error('Erro detalhado:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();