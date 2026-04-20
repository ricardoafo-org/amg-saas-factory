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

export type AppointmentReminderProps = {
  customerName: string;
  serviceName: string;
  scheduledAt: string;
  plate: string;
  businessName: string;
  businessAddress: string;
  rescheduleLink: string;
  cancelLink: string;
  baseUrl: string;
  primaryColor: string;
};

export function AppointmentReminder({
  customerName,
  serviceName,
  scheduledAt,
  plate,
  businessName,
  businessAddress,
  rescheduleLink,
  cancelLink,
  baseUrl,
  primaryColor,
}: AppointmentReminderProps) {
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

  const formattedTime = (() => {
    try {
      return new Date(scheduledAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(businessAddress)}`;

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Recuerda tu cita mañana — {serviceName}</Preview>
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
              Recuerda tu cita mañana
            </Heading>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Hola {customerName},</Text>
            <Text style={textStyle}>
              Te recordamos que mañana tienes una cita en <strong>{businessName}</strong>:
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
              <Row style={{ marginBottom: '8px' }}>
                <Column style={labelCol}>Hora</Column>
                <Column style={valueCol}>{formattedTime}</Column>
              </Row>
              <Hr style={dividerStyle} />
              <Row>
                <Column style={labelCol}>Matrícula</Column>
                <Column style={valueCol}>{plate}</Column>
              </Row>
            </Section>

            <Text style={textStyle}>
              Dirección:{' '}
              <Link href={mapsLink} style={{ color: primaryColor }}>
                {businessAddress} (ver en Google Maps)
              </Link>
            </Text>

            <Section style={actionsStyle}>
              <Row>
                <Column style={{ paddingRight: '8px' }}>
                  <Link
                    href={rescheduleLink}
                    style={{
                      backgroundColor: primaryColor,
                      color: '#ffffff',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '13px',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Reprogramar cita
                  </Link>
                </Column>
                <Column>
                  <Link
                    href={cancelLink}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#666666',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '13px',
                      textDecoration: 'none',
                      border: '1px solid #cccccc',
                      display: 'inline-block',
                    }}
                  >
                    Cancelar
                  </Link>
                </Column>
              </Row>
            </Section>
          </Section>

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              <strong>{businessName}</strong>
              <br />
              {businessAddress}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default AppointmentReminder;

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

const actionsStyle: React.CSSProperties = {
  margin: '24px 0 8px',
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
