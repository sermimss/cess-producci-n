# WhatsApp Gemini Chatbot

Este es un microservicio aislado para manejar el chatbot de WhatsApp utilizando OpenWA y Gemini API.
Puede ejecutarse de forma independiente a tu aplicación principal, usando Docker.

## Pasos para ejecutar en Docker local o en la nube

1.  **Construir la imagen de Docker**:
    En tu terminal, navega a la carpeta \`chatbot-service\` y ejecuta:
    \`\`\`bash
    docker build -t whatsapp-chatbot .
    \`\`\`

2.  **Ejecutar el contenedor**:
    Inicia el contenedor pasando tus variables de entorno necesarias:
    \`\`\`bash
    docker run -p 3001:3001 \\
      -e GEMINI_API_KEY="tu_api_key_de_gemini" \\
      -e OPENWA_API_KEY="tu_api_key_de_openwa" \\
      -e OPENWA_SESSION_ID="tu_id_de_sesion" \\
      -e OPENWA_URL="tu_url_de_openwa" \\
      whatsapp-chatbot
    \`\`\`

3.  **Configurar Webhook**:
    Apunta el webhook de tu servidor de OpenWA a la URL donde hayas desplegado este contenedor (por ejemplo: \`http://tu_IP:3001/api/webhook/whatsapp\`).

## Variables de Entorno

*   \`GEMINI_API_KEY\`: Requerido para generar las respuestas.
*   \`OPENWA_API_KEY\`: Tu clave de OpenWA.
*   \`OPENWA_SESSION_ID\`: ID de la sesión de tu cuenta en OpenWA.
*   \`OPENWA_URL\`: RL de tu API de OpenWA (por ejemplo: \`http://localhost:2785/api\`).
*   \`PORT\`: Puerto donde el servicio escucha (predeterminado: 3001).
