export const dictionary = {
    meta: {
        title: 'Smulti Downloader ♪',
        description:
            'Download and preserve your musical moments with Smulti Downloader.',
    },
    donate: {
        button: 'Support This Project',
    },
    hero: {
        title: 'Smulti Downloader ♪',
        description:
            'Download and preserve your musical moments with Smulti Downloader.',
    },
    features: {
        title: 'Why Save Your Recordings?',
        downloadMulti: {
            title: 'Download Multiple Recordings at once',
            description:
                'Easily download all your recordings in one go. No more tedious individual downloads.',
        },
        createShare: {
            title: 'Create & Share',
            description:
                'Use your recordings in videos, share with friends and family, or keep them as cherished memories.',
        },
        protect: {
            title: 'Protect Your Work',
            description:
                "Apps can shut down unexpectedly. Remember Glee Karaoke? Don't risk losing your recordings forever.",
        },
        simple: {
            title: 'Simple & Fast',
            description:
                "Just paste your links, and we'll handle the rest. Download multiple recordings at once.",
        },
    },
    howItWorks: {
        title: 'How It Works',
        step1: {
            title: 'Paste Links',
            description:
                'Enter links separated by commas or upload a text file',
        },
        step2: {
            title: 'Process',
            description: 'Our system extracts and processes your recordings',
        },
        step3: {
            title: 'Download',
            description: 'Get your MP3 files individually or all at once',
        },
    },
    faq: {
        title: 'Frequently Asked Questions',
        items: [
            {
                question: 'Is this service free to use?',
                answer: 'Yes, Smulti Downloader is completely free to use. We rely on donations to keep the service running and cover server costs.',
            },
            {
                question: 'How long does it take to process a recording?',
                answer: 'Most recordings are processed within 1-2 minutes. Processing time may vary depending on the length of the recording and server load.',
            },
            {
                question: 'Can i download multiple files at once?',
                answer: 'Yes, you can download multiple recordings at once. Just paste the links separated by commas or upload a text file with the links.',
            },
            {
                question: 'What format are the downloads in?',
                answer: 'All downloads are in MP3 format, which is compatible with most devices and media players.',
            },
            {
                question:
                    'Is there a limit to how many recordings I can download?',
                answer: 'There is no strict limit, but we recommend downloading no more than 50 recordings at once to ensure optimal performance.',
            },
            {
                question: 'Why did my download fail?',
                answer: "Downloads may fail if the original recording was deleted, set to private, or if there was a temporary server issue. You can try the 'Retry' button to attempt the download again.",
            },
        ],
    },
    footer: {
        disclaimer:
            'Use responsibly and only download content you have permission to access.',
    },
    error: {
        title: 'Error',
    },
}

export type Dictionary = typeof dictionary
