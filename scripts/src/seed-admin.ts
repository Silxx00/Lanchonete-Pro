import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const users = [
  { name: "Administrador", email: "admin@novaera.com", password: "admin123", role: "admin" },
  { name: "Gerente", email: "gerente@novaera.com", password: "Gerente123", role: "manager" },
  { name: "Funcionário", email: "funcionario@novaera.com", password: "Funcionario123", role: "employee" },
];

const categories = ["Lanches", "Bebidas", "Sobremesas", "Porções", "Combos"];

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [u.email]);
    if (existing.rows.length > 0) {
      await pool.query(
        "UPDATE users SET password_hash = $1, name = $2, role = $3, active = true WHERE email = $4",
        [hash, u.name, u.role, u.email]
      );
      console.log(`✅ Atualizado: ${u.email} (nova senha: ${u.password}) — perfil: ${u.role}`);
    } else {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, active) VALUES ($1, $2, $3, $4, true)",
        [u.name, u.email, hash, u.role]
      );
      console.log(`✅ Criado: ${u.email} (senha: ${u.password}) — perfil: ${u.role}`);
    }
  }

  for (const name of categories) {
    const existing = await pool.query("SELECT id FROM categories WHERE name = $1", [name]);
    if (existing.rows.length === 0) {
      await pool.query(
        "INSERT INTO categories (name, description, active) VALUES ($1, $2, true)",
        [name, `Categoria ${name}`]
      );
      console.log(`✅ Categoria criada: ${name}`);
    } else {
      console.log(`✓ Categoria já existe: ${name}`);
    }
  }

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📋 Credenciais de acesso:");
  console.log("   Admin:       admin@novaera.com       / Admin123");
  console.log("   Gerente:     gerente@novaera.com     / Gerente123");
  console.log("   Funcionário: funcionario@novaera.com / Funcionario123");

  await pool.end();
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
