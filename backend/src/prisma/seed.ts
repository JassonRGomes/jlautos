import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Strip surrounding quotes that Hostinger hPanel may include when reading .env values
const rawDbUrl = process.env.DATABASE_URL || '';
const databaseUrl = rawDbUrl.replace(/^["']|["']$/g, '');

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

async function main() {
  console.log('🚀 Iniciando seed do banco de dados J&L Autos...');

  try {
    // Limpar o banco (ordem importa por causa das FK)
    await prisma.activityLog.deleteMany();
    await prisma.testDrive.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.savedSearch.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.financialTransaction.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.product.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.category.deleteMany();
    await prisma.availabilitySlot.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Banco de dados limpo.');

    // ── Criar Usuário Admin Padrão ──────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin', salt);

    await prisma.user.create({
      data: {
        email: 'admin@jlautos.com',
        passwordHash: adminPass,
        name: 'Administrador J&L Autos',
        role: 'ADMIN',
        forcePasswordChange: false,
        isActive: true,
      },
    });

    console.log('✅ Usuário admin criado: admin@jlautos.com / admin');

    // ── Categorias Iniciais ─────────────────────────────────────────────
    await prisma.category.createMany({
      data: [
        { name: 'Peças Automotivas', description: 'Peças de reposição e componentes' },
        { name: 'Acessórios', description: 'Acessórios e melhorias para veículos' },
      ],
    });

    console.log('✅ Categorias criadas.');
    console.log('');
    console.log('🎉 Seed concluído com sucesso!');
    console.log('   Login: admin@jlautos.com');
    console.log('   Senha: admin');

  } catch (err) {
    console.error('❌ Erro no seed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
