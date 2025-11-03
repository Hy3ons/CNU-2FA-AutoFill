interface EmailAddress {
    name: string;
    address: string;
}

interface From {
    emailAddress: EmailAddress;
}

interface EmailBody {
    contentType: 'text' | 'html'; // 'text' 또는 'html' 중 하나
    content: string; // 실제 메일 본문 내용 (OTP 포함)
}

export interface MicroSoftEmailEntity {
    "@odata.etag": string;
    id: string;
    receivedDateTime: string; // ISO 8601 형식의 시간 문자
    body: EmailBody;
    from: From;
}