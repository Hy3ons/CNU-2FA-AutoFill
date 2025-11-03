import { Client } from '@microsoft/microsoft-graph-client';
import { SENDER_EMAIL } from '../constant/constant';
import { getAccessTokenFromBackground } from './auth';
import { MicroSoftEmailEntity} from './mail-interface';

async function getAccessToken(): Promise<string> {
    return await getAccessTokenFromBackground();
}

export async function createGetOTPCycle () {
    //재귀적 콜을 이용한 2초마다 OTP얻어보기.
    const nowTime = new Date();

    return new Promise<string | null>(async (resolve) => {
        async function checkForOTP() {
            const otp = await getLatestOTPMail(nowTime);
            if (otp !== null) {
                resolve(otp);
            } else {
                setTimeout(checkForOTP, 2000);
            }
        }
        checkForOTP();
    });
}

async function getLatestOTPMail(localTime : Date): Promise<string | null> {
    const accessToken : string = await getAccessToken();

    const client = Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });

    try {
        const response = await client.api('/me/messages')
            .select('body,receivedDateTime,from')        // 메일 본문과 수신 시간만 가져오기
            // .filter(`from/emailAddress/address eq '${SENDER_EMAIL}'`) // 특정 발신자 이메일 주소로 필터링
            .orderby('receivedDateTime desc')       // 최신 메일 순으로 정렬
            .top(3)                                 // 가장 최신 메일 1개만 가져오기
            .get();

        const latestEmail = response.value.find((email: MicroSoftEmailEntity) => 
                    email.from.emailAddress.address === SENDER_EMAIL) as MicroSoftEmailEntity;

        if (!latestEmail || !latestEmail.body || !latestEmail.body.content) {
            return null;
        }

        const emailBody = latestEmail.body.content;
        const receivedDateTime : Date = new Date(latestEmail.receivedDateTime)

        // 이전에 받은 메일인 경우 제거한다.
        if (receivedDateTime < localTime) return null;

        // 3. OTP 파싱
        const otpRegex = /OTP\s*:\s*(\d{6})/i;
        const match = emailBody.match(otpRegex);

        if (match && match[1]) {
            const otpCode = match[1];
            return otpCode;
        }

        return null;
    } catch (error) {
        return null;
    }
}
