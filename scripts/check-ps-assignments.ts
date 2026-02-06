// Script para verificar asignaciones en PeopleSoft
import { bienesPorEmpleadoPS } from "../src/server/integrations/collabApi";
import { parseBienesEmpleadoResponse } from "../src/server/integrations/psBienesParser";

async function checkAssignments() {
    const emplid = "098075";

    console.log("=".repeat(60));
    console.log(`Consultando equipos en PeopleSoft para EMPLID: ${emplid}`);
    console.log("=".repeat(60));

    try {
        const { json, xml } = await bienesPorEmpleadoPS(emplid);

        console.log("\n📦 Respuesta SOAP recibida");
        console.log("Tamaño del XML:", xml?.length || 0, "bytes");

        // Parse the response
        const bienes = parseBienesEmpleadoResponse(json);

        console.log("\n📋 EQUIPOS ENCONTRADOS EN PEOPLESOFT:");
        console.log("Total de equipos:", bienes.length);
        console.log("-".repeat(60));

        if (bienes.length === 0) {
            console.log("❌ No se encontraron equipos asignados en PeopleSoft");
        } else {
            bienes.forEach((bien, index) => {
                console.log(`\n[${index + 1}] Equipo:`);
                console.log("  EMPLID:", bien.emplid || "N/A");
                console.log("  Property ID:", bien.propertyId || "N/A");
                console.log("  Descripción:", bien.descrLong || "N/A");
                console.log("  Fecha asignación:", bien.dtIssued || "N/A");
                console.log("  Fecha devolución:", bien.dtReturned || "NO DEVUELTO");
            });
        }

        // Check for the specific serials assigned
        console.log("\n" + "=".repeat(60));
        console.log("VERIFICACIÓN DE ASIGNACIONES ESPERADAS:");
        console.log("=".repeat(60));

        const expectedSerials = ["MKONJIBHJ01", "MKONJIBHJ02"];

        expectedSerials.forEach(serial => {
            const found = bienes.find(b => b.propertyId === serial);
            if (found) {
                console.log(`✅ ${serial}: ENCONTRADO en PeopleSoft`);
                console.log(`   Asignado: ${found.dtIssued || "N/A"}`);
                console.log(`   Devuelto: ${found.dtReturned || "NO"}`);
            } else {
                console.log(`❌ ${serial}: NO ENCONTRADO en PeopleSoft`);
            }
        });

        console.log("\n" + "=".repeat(60));

    } catch (error: any) {
        console.error("\n❌ ERROR al consultar PeopleSoft:");
        console.error("Mensaje:", error?.message);
        console.error("Código:", error?.code);

        if (error?.message?.includes("ENETUNREACH")) {
            console.log("\n⚠️  El servidor PeopleSoft no es accesible desde esta máquina");
            console.log("   Esto puede deberse a:");
            console.log("   - VPN no conectada");
            console.log("   - Firewall bloqueando la conexión");
            console.log("   - Servidor PeopleSoft fuera de línea");
        }
    }
}

checkAssignments().then(() => {
    console.log("\n✓ Verificación completada");
    process.exit(0);
}).catch((err) => {
    console.error("Error fatal:", err);
    process.exit(1);
});
