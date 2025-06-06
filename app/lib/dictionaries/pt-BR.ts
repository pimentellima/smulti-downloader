export const dictionary = {
    meta: {
        title: 'Smulti Downloader ♪',
        description:
            'Baixe vídeos e músicas do YouTube com o Smulti Downloader',
    },
    donate: {
        button: 'Apoie Este Projeto',
    },
    hero: {
        title: 'Smulti Downloader ♪',
        description: 'Baixe vídeos e músicas do YouTube com facilidade',
    },
    features: {
        title: 'Por que baixar conteúdo do YouTube?',
        downloadMulti: {
            title: 'Baixe Vários Vídeos de uma Só Vez',
            description:
                'Economize tempo baixando vários links ao mesmo tempo. Sem necessidade de baixar um por um.',
        },
        createShare: {
            title: 'Use e Compartilhe',
            description:
                'Use vídeos ou músicas para projetos, playlists offline ou compartilhe com quem quiser.',
        },
        protect: {
            title: 'Garanta o Acesso Offline',
            description:
                'Vídeos podem ser removidos ou ficar indisponíveis. Salve o que é importante para você.',
        },
        simple: {
            title: 'Simples e Eficiente',
            description:
                'Cole os links do YouTube e deixe o resto com a gente. Baixe múltiplos arquivos em poucos cliques.',
        },
    },
    howItWorks: {
        title: 'Como Funciona',
        step1: {
            title: 'Cole os Links do YouTube',
            description:
                'Insira os links separados por vírgulas ou envie um arquivo de texto com os links',
        },
        step2: {
            title: 'Processamento',
            description:
                'O sistema extrai os vídeos ou áudios dos links fornecidos',
        },
        step3: {
            title: 'Download',
            description:
                'Baixe seus arquivos em M4A (áudio), MP4 (vídeo), ou WEBM (áudio e vídeo), individualmente ou todos de uma vez',
        },
    },
    faq: {
        title: 'Perguntas Frequentes',
        items: [
            {
                question: 'Este serviço é gratuito?',
                answer: 'Sim, o Smulti Downloader é totalmente gratuito. Aceitamos doações para ajudar a manter o serviço funcionando e cobrir custos com servidores.',
            },
            {
                question: 'Quanto tempo leva para processar um vídeo?',
                answer: 'Geralmente entre 1 e 2 minutos, dependendo do tamanho do vídeo e da demanda do sistema.',
            },
            {
                question: 'Posso baixar vários vídeos ao mesmo tempo?',
                answer: 'Sim! Basta colar os links separados por vírgulas ou fazer upload de um arquivo de texto contendo os links.',
            },
            {
                question: 'Quais formatos estão disponíveis para download?',
                answer: 'Os downloads estão disponíveis nos formatos M4A (áudio), MP4 (vídeo) ou WEBM (áudio e vídeo), compatíveis com a maioria dos dispositivos modernos.',
            },
            {
                question: 'Existe um limite de quantos vídeos posso baixar?',
                answer: 'Recomendamos até 50 links por vez para garantir estabilidade e bom desempenho.',
            },
            {
                question: 'Por que meu download falhou?',
                answer: "Isso pode acontecer se o vídeo foi removido, está com restrições de acesso ou houve uma falha temporária. Use o botão 'Tentar Novamente' para tentar novamente.",
            },
        ],
    },
    footer: {
        disclaimer:
            'Use com responsabilidade e baixe apenas conteúdos que você tenha permissão para acessar.',
    },
    error: {
        title: 'Erro',
    },
}

export type Dictionary = typeof dictionary
