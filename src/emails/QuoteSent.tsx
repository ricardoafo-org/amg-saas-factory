import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type QuoteLineItem = {
  description: string;
  qty: number;
  unitPrice: number;
  type: 'labour' | 'part' | 'other';
};

export type QuoteSentProps = {
  customerName: string;
  items: QuoteLineItem[];
  subtotal: number;
  ivaRate: number;
  total: number;
  validUntilStr: string;
  approvalLink: string;
  businessName: string;
  baseUrl: string;
  primaryColor: string;
};

export function QuoteSent({
  customerName,
  items,
  subtotal,
  ivaRate,
  total,
  validUntilStr,
  approvalLink,
  businessName,
  baseUrl,
  primaryColor,
}: QuoteSentProps) {
  const ivaAmount = total - subtotal;
  const ivaPercent = Math.round(ivaRate * 100);

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>
        Tu presupuesto de {businessName} — €{total.toFixed(2)}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ textAlign: 'center', padding: '24px 0 16px' }}>
            <Img
              src={`${baseUrl}/logo.svg`}
              alt={businessName}
              width={120}
              height={40}
              style={{ display: 'inline-block' }}
            />
          </Section>

          <Section style={{ backgroundColor: primaryColor, padding: '24px 32px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', fontSize: '22px', margin: '0', fontFamily: 'sans-serif' }}>
              Tu presupuesto
            </Heading>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hola {customerName},</Text>
            <Text style={textStyle}>
              Adjuntamos el presupuesto de <strong>{businessName}</strong>. A continuación encontrarás el detalle de los trabajos:
            </Text>

            {/* Line items table */}
            <Section style={tableWrapStyle}>
              <Row style={tableHeaderRow}>
                <Column style={{ ...tableHeaderCell, width: '50%' }}>Descripción</Column>
                <Column style={{ ...tableHeaderCell, width: '10%', textAlign: 'center' }}>Ud.</Column>
                <Column style={{ ...tableHeaderCell, width: '20%', textAlign: 'right' }}>P. unit.</Column>
                <Column style={{ ...tableHeaderCell, width: '20%', textAlign: 'right' }}>Subtotal</Column>
              </Row>
              {items.map((item, i) => (
                <Row key={i} style={i % 2 === 0 ? tableRowEven : tableRowOdd}>
                  <Column style={{ ...tableCell, width: '50%' }}>{item.description}</Column>
                  <Column style={{ ...tableCell, width: '10%', textAlign: 'center' }}>{item.qty}</Column>
                  <Column style={{ ...tableCell, width: '20%', textAlign: 'right' }}>
                    €{item.unitPrice.toFixed(2)}
                  </Column>
                  <Column style={{ ...tableCell, width: '20%', textAlign: 'right' }}>
                    €{(item.qty * item.unitPrice).toFixed(2)}
                  </Column>
                </Row>
              ))}
            </Section>

            {/* Totals */}
            <Section style={totalsStyle}>
              <Row style={{ marginBottom: '4px' }}>
                <Column style={totalLabelCol}>Subtotal (sin IVA)</Column>
                <Column style={totalValueCol}>€{subtotal.toFixed(2)}</Column>
              </Row>
              <Row style={{ marginBottom: '4px' }}>
                <Column style={totalLabelCol}>IVA ({ivaPercent}%)</Column>
                <Column style={totalValueCol}>€{ivaAmount.toFixed(2)}</Column>
              </Row>
              <Hr style={{ borderColor: '#dddddd', margin: '8px 0' }} />
              <Row>
                <Column style={{ ...totalLabelCol, fontWeight: '700', fontSize: '15px', color: '#111111' }}>
                  TOTAL
                </Column>
                <Column style={{ ...totalValueCol, fontWeight: '700', fontSize: '15px', color: '#111111' }}>
                  €{total.toFixed(2)}
                </Column>
              </Row>
            </Section>

            <Text style={validityStyle}>
              Válido hasta: {validUntilStr} (12 días hábiles — RD 1457/1986)
            </Text>

            {/* CTA */}
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link
                href={approvalLink}
                style={{
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Aceptar presupuesto
              </Link>
            </Section>

            <Text style={disclaimerStyle}>
              Presupuesto sin compromiso. Precios sin IVA salvo indicación.
              Este presupuesto es orientativo (RD 1457/1986 Art. 14).
            </Text>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              <strong>{businessName}</strong>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default QuoteSent;

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f4',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
};

const contentStyle: React.CSSProperties = {
  padding: '24px 32px',
};

const greetingStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#111111',
  marginBottom: '8px',
};

const textStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.6',
};

const tableWrapStyle: React.CSSProperties = {
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  overflow: 'hidden',
  margin: '16px 0',
};

const tableHeaderRow: React.CSSProperties = {
  backgroundColor: '#f0f0f0',
};

const tableHeaderCell: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#444444',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e5e5',
};

const tableCell: React.CSSProperties = {
  fontSize: '13px',
  color: '#333333',
  padding: '8px 10px',
};

const tableRowEven: React.CSSProperties = {
  backgroundColor: '#ffffff',
};

const tableRowOdd: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
};

const totalsStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '8px 0 16px',
};

const totalLabelCol: React.CSSProperties = {
  width: '70%',
  fontSize: '13px',
  color: '#444444',
  paddingBottom: '4px',
};

const totalValueCol: React.CSSProperties = {
  width: '30%',
  fontSize: '13px',
  color: '#111111',
  textAlign: 'right',
  paddingBottom: '4px',
};

const validityStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#555555',
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '4px',
  padding: '8px 12px',
  margin: '0 0 8px',
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#888888',
  fontStyle: 'italic',
  lineHeight: '1.5',
};

const footerStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f4',
  padding: '16px 32px',
  borderTop: '1px solid #e5e5e5',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888888',
};
