// Script para registrar asignaciones en PeopleSoft manualmente
// Uso: npx tsx scripts/register-assignment-ps.ts <EMPLID> <SERIAL> [FECHA]

const emplid = process.argv[2];
const propertyId = process.argv[3];
const dtIssued = process.argv[4] || new Date().toISOString().split('T')[0];

if (!emplid || !propertyId) {
    console.error("❌ Uso: npx tsx scripts/register-assignment-ps.ts <EMPLID> <SERIAL> [FECHA]");
    console.error("   Ejemplo: npx tsx scripts/register-assignment-ps.ts 098075 MKONJIBHJ02 2026-02-06");
    process.exit(1);
}

console.log("=".repeat(60));
console.log("REGISTRANDO ASIGNACIÓN EN PEOPLESOFT");
console.log("=".repeat(60));
console.log("EMPLID:", emplid);
console.log("Property ID:", propertyId);
console.log("Fecha asignación:", dtIssued);
console.log("-".repeat(60));

const url = `http://localhost:3000/api/ps/bienes/asignar`;

fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        emplid,
        propertyId,
        dtIssued,
    })
})
    .then(async res => {
        const data = await res.json();

        if (res.ok) {
            console.log("\n✅ ÉXITO: Asignación registrada en PeopleSoft");
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error("\n❌ ERROR:", res.status);
            console.error(JSON.stringify(data, null, 2));

            if (res.status === 401) {
                console.log("\n⚠️  Necesitas estar autenticado en el navegador");
                console.log("   Abre http://localhost:3000 e inicia sesión primero");
            }
        }
    })
    .catch(err => {
        console.error("\n❌ Error de red:", err.message);
        console.log("\n⚠️  Asegúrate de que el servidor esté corriendo (npm run dev)");
    });
