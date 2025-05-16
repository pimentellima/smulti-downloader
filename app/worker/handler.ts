import type { SQSEvent, SQSHandler } from 'aws-lambda'

export const main: SQSHandler = async (event: SQSEvent) => {
    for (const record of event.Records) {
        try {

            // ✅ Lógica de processamento da mensagem
            console.log('Mensagem recebida:', record.body)

            // Exemplo: fazer algo com os dados
            // await processMessage(body)
        } catch (err) {
            console.error('Erro ao processar mensagem:', err)
            // Erros não tratados podem causar reprocessamento da mensagem
        }
    }

    // AWS Lambda finaliza com sucesso
    return
}
