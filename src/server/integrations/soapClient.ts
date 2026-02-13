// src/server/integrations/soapClient.ts
import "server-only";
import axios from "axios";
import crypto from "crypto";

/**
 * Generate WS-Security header with UsernameToken
 * This matches what SoapUI sends for PeopleSoft
 */
function generateWsseHeader(username: string, password: string): string {
  // Generate nonce (random bytes, base64 encoded)
  const nonceBytes = crypto.randomBytes(16);
  const nonce = nonceBytes.toString("base64");

  // Generate created timestamp in ISO format
  const created = new Date().toISOString();

  // Generate unique token ID
  const tokenId = `UsernameToken-${crypto.randomUUID()}`;

  return `<wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><wsse:UsernameToken wsu:Id="${tokenId}"><wsse:Username>${username}</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password><wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonce}</wsse:Nonce><wsu:Created>${created}</wsu:Created></wsse:UsernameToken></wsse:Security>`;
}

export interface SoapPostOptions {
  /** Override user (instead of PS_SOAP_USER) */
  user?: string;
  /** Override password (instead of PS_SOAP_PASS) */
  pass?: string;
}

export async function soapPost(
  endpointUrl: string,
  action: string | undefined,
  bodyXml: string,
  namespace?: string,
  opts?: SoapPostOptions
) {
  const timeout = Number(process.env.PS_SOAP_TIMEOUT_MS ?? 45000) || 45000;

  // Use service-specific credentials if provided, else fallback to generic
  const user = (opts?.user || process.env.PS_SOAP_USER || "").replace(/^["']|["']$/g, '').trim();
  const pass = (opts?.pass || process.env.PS_SOAP_PASS || "").replace(/^["']|["']$/g, '').trim();

  // Build WS-Security header if credentials are provided
  let soapHeader = "";
  if (user && pass) {
    soapHeader = generateWsseHeader(user, pass);
    console.log("[soapClient] Request WITH WS-Security authentication");
    console.log("[soapClient] Using user:", user);
  } else {
    console.log("[soapClient] Request WITHOUT authentication (no credentials)");
  }

  // Build namespace attributes for envelope (like SoapUI does)
  const nsAttr = namespace ? ` xmlns:ph="${namespace}"` : "";

  // SOAP envelope with WS-Security header
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope${nsAttr} xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header>${soapHeader}</soapenv:Header>
  <soapenv:Body>${bodyXml}</soapenv:Body>
</soapenv:Envelope>`;

  const urlObj = new URL(endpointUrl);
  const hostHeader = urlObj.port ? `${urlObj.hostname}:${urlObj.port}` : urlObj.hostname;

  const headers: Record<string, string> = {
    "Accept-Encoding": "gzip,deflate",
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": action ? `"${action}"` : '""',
    "Host": hostHeader,
    "Connection": "Keep-Alive",
    "User-Agent": "Apache-HttpClient/4.5.5 (Java/17.0.12)",
  };

  console.log("[soapClient] POST", endpointUrl);
  console.log("[soapClient] SOAPAction:", action || "(none)");

  const r = await axios.post(endpointUrl, envelope, {
    headers,
    timeout,
    maxRedirects: 5,
    decompress: true,
  });

  return r.data as string;
}
