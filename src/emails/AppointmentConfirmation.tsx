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

export type AppointmentConfirmationProps = {
  customerName: string;
  serviceName: string;
  scheduledAt: string;
  plate: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  warrantyNote: string;
  cancelLink: string;
  baseUrl: string;
  primaryColor: string;
};

export function AppointmentConfirmation({
  customerName,
  serviceName,
  scheduledAt,
  plate,
  businessName,
  businessPhone,
  businessAddress,
  warrantyNote,
  cancelLink,
  baseUrl,
  primaryColor,
}: AppointmentConfirmationProps) {
  const formattedDate = (() => {
    try {
      return new Date(scheduledAt).toLocaleString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return scheduledAt;
    }
  })();

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>✓ Cita confirmada — {serviceName}</Preview>
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
              ✓ Cita confirmada
            </Heading>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hola {customerName},</Text>
            <Text style={textStyle}>
              Tu cita en <strong>{businessName}</strong> ha sido confirmada. Aquí tienes el resumen:
            </Text>

            <Section style={boxStyle}>
              <Row style={{ marginBottom: '8px' }}>
                <Column style={labelCol}>Servicio</Column>
                <Column style={valueCol}>{serviceName}</Column>
              </Row>
              <Hr style={dividerStyle} />
              <Row style={{ marginBottom: '8px' }}>
                <Column style={labelCol}>Fecha y hora</Column>
                <Column style={valueCol}>{formattedDate}</Column>
              </Row>
              <Hr style={dividerStyle} />
              <Row>
                <Column style={labelCol}>Matrícula</Column>
                <Column style={valueCol}>{plate}</Column>
              </Row>
            </Section>

            <Text style={warrantyStyle}>
              {warrantyNote}
            </Text>

            <Text style={textStyle}>
              ¿Necesitas cancelar?{' '}
              <Link href={cancelLink} style={{ color: primaryColor }}>
                Cancela tu cita aquí
              </Link>
            </Text>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              <strong>{businessName}</strong>
              <br />
              {businessAddress}
              <br />
              Tel: {businessPhone}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default AppointmentConfirmation;

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

const dividerStyle: React.CSSProperties = {
  borderColor: '#e5e5e5',
  margin: '4px 0 8px',
};

const warrantyStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555555',
  fontStyle: 'italic',
  borderTop: '1px solid #eeeeee',
  borderBottom: '1px solid #eeeeee',
  padding: '10px 0',
  margin: '16px 0',
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
