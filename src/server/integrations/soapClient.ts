// src/server/integrations/soapClient.ts
import "server-only";
import axios from "axios";

export async function soapPost(
  endpointUrl: string,
  action: string | undefined,
  bodyXml: string
) {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header/>
    <soapenv:Body>${bodyXml}</soapenv:Body>
  </soapenv:Envelope>`;

  const headers: Record<string, string> = {
    "Content-Type": "text/xml;charset=UTF-8",
    Accept: "text/xml, application/xml",
  };
  if (action && action.length) headers["SOAPAction"] = action;

  const authNeeded =
    (process.env.PS_SOAP_AUTH || "").toLowerCase() === "basic" &&
    !!process.env.PS_SOAP_USER &&
    !!process.env.PS_SOAP_PASS;

  const timeout =
    Number(process.env.PS_SOAP_TIMEOUT_MS ?? 45000) || 45000;

  const r = await axios.post(endpointUrl, envelope, {
    headers,
    timeout,
    auth: authNeeded
      ? {
          username: String(process.env.PS_SOAP_USER),
          password: String(process.env.PS_SOAP_PASS),
        }
      : undefined,
  });

  return r.data as string;
}
