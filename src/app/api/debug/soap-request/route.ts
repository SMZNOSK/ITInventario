// src/app/api/debug/soap-request/route.ts
// Debug endpoint to see the exact SOAP request being sent
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
    const ns = process.env.PS_ALTA_COLAB_NS;
    const action = process.env.PS_ALTA_COLAB_ACTION;
    const endpoint = process.env.PS_ALTA_COLAB_ENDPOINT;
    const user = process.env.PS_SOAP_USER?.replace(/^["']|["']$/g, '').trim();
    const pass = process.env.PS_SOAP_PASS?.replace(/^["']|["']$/g, '').trim();

    // Build exact SOAP body
    const bodyXml = `
    <ph:PH_ALTA_COLAB_REQ xmlns:ph="${ns}">
      <ph:FieldTypes>
        <ph:PH_COLAB_SAP_TB class="R">
          <ph:EMPLID type="CHAR"/>
        </ph:PH_COLAB_SAP_TB>
        <ph:PSCAMA class="R">
          <ph:LANGUAGE_CD type="CHAR"/>
          <ph:AUDIT_ACTN type="CHAR"/>
          <ph:BASE_LANGUAGE_CD type="CHAR"/>
          <ph:MSG_SEQ_FLG type="CHAR"/>
          <ph:PROCESS_INSTANCE type="NUMBER"/>
          <ph:PUBLISH_RULE_ID type="CHAR"/>
          <ph:MSGNODENAME type="CHAR"/>
        </ph:PSCAMA>
      </ph:FieldTypes>
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_COLAB_SAP_TB class="R">
            <ph:EMPLID IsChanged="Y">098075</ph:EMPLID>
          </ph:PH_COLAB_SAP_TB>
          <ph:PSCAMA class="R">
            <ph:LANGUAGE_CD IsChanged="N">ESP</ph:LANGUAGE_CD>
            <ph:AUDIT_ACTN IsChanged="N">N</ph:AUDIT_ACTN>
            <ph:BASE_LANGUAGE_CD IsChanged="N">ESP</ph:BASE_LANGUAGE_CD>
            <ph:MSG_SEQ_FLG IsChanged="N">N</ph:MSG_SEQ_FLG>
            <ph:PROCESS_INSTANCE IsChanged="N">0</ph:PROCESS_INSTANCE>
            <ph:PUBLISH_RULE_ID IsChanged="N"></ph:PUBLISH_RULE_ID>
            <ph:MSGNODENAME IsChanged="N"></ph:MSGNODENAME>
          </ph:PSCAMA>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_ALTA_COLAB_REQ>
  `.trim();

    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;

    // Build auth header
    const authHeader = user && pass
        ? `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
        : null;

    return NextResponse.json({
        endpoint,
        httpHeaders: {
            "Content-Type": "text/xml;charset=UTF-8",
            "Accept": "text/xml, application/xml",
            "SOAPAction": action,
            "Authorization": authHeader ? `Basic ${user.substring(0, 4)}****:****` : "(not set)"
        },
        actualAuthHeader: authHeader,
        soapEnvelope: envelope,
        note: "Copia el soapEnvelope y compáralo con el Raw de SoapUI"
    }, {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}
