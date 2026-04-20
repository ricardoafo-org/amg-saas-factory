import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type VehicleReadyProps = {
  customerName: string;
  plate: string;
  servicesPerformed: string[];
  amountDue: number;
  ivaRate: number;
  businessName: string;
  businessPhone: string;
  businessHours: string;
  baseUrl: string;
  primaryColor: string;
};

export function VehicleReady({
  customerName,
  plate,
  servicesPerformed,
  amountDue,
  ivaRate,
  businessName,
  businessPhone,
  businessHours,
  baseUrl,
  primaryColor,
}: VehicleReadyProps) {
  const ivaAmount = amountDue * ivaRate;
  const total = amountDue + ivaAmount;
  const ivaPercent = Math.round(ivaRate * 100);

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Tu vehículo {plate} está listo</Preview>
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
              ¡Tu vehículo está listo!
            </Heading>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hola {customerName},</Text>
            <Text style={textStyle}>
              ¡Tu vehículo <strong>{plate}</strong> ya está listo para recoger!
            </Text>

            {/* Services performed */}
            <Section style={boxStyle}>
              <Text style={sectionTitleStyle}>Trabajos realizados</Text>
              {servicesPerformed.map((service, i) => (
                <Row key={i}>
                  <Column style={serviceItemStyle}>✓ {service}</Column>
                </Row>
              ))}
            </Section>

            {/* Amount breakdown */}
            <Section style={totalsStyle}>
              <Row style={{ marginBottom: '4px' }}>
                <Column style={totalLabelCol}>Base imponible</Column>
                <Column style={totalValueCol}>€{amountDue.toFixed(2)}</Column>
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

            {/* Business info */}
            <Section style={infoBoxStyle}>
              <Row style={{ marginBottom: '6px' }}>
                <Column style={labelCol}>Teléfono</Column>
                <Column style={valueCol}>{businessPhone}</Column>
              </Row>
              <Hr style={{ borderColor: '#e5e5e5', margin: '4px 0 8px' }} />
              <Row>
                <Column style={labelCol}>Horario</Column>
                <Column style={valueCol}>{businessHours}</Column>
              </Row>
            </Section>

            <Text style={warrantyStyle}>
              Garantía: 3 meses / 2.000 km (RD 1457/1986 Art. 16).
            </Text>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              <strong>{businessName}</strong>
              <br />
              Tel: {businessPhone}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default VehicleReady;

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f4',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
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

const boxStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#444444',
  margin: '0 0 8px',
};

const serviceItemStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#333333',
  paddingBottom: '4px',
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

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#f9f9f9',
  border: '1px solid #e5e5e5',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '8px 0',
};

const labelCol: React.CSSProperties = {
  width: '40%',
  color: '#666666',
  fontSize: '13px',
  paddingBottom: '8px',
};

const valueCol: React.CSSProperties = {
  width: '60%',
  fontWeight: '600',
  fontSize: '13px',
  color: '#111111',
  paddingBottom: '8px',
};

const warrantyStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555555',
  fontStyle: 'italic',
  borderTop: '1px solid #eeeeee',
  padding: '10px 0 0',
  margin: '16px 0 0',
};

const footerStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f4',
  padding: '16px 32px',
  borderTop: '1px solid #e5e5e5',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#888888',
  lineHeight: '1.6',
};
