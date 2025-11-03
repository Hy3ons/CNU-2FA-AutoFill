import { createGetOTPCycle } from "../logic/mail-service"

function changeConfirmButtonState () {
    const selector = 'button.confirm_btn[onclick*="callVerifyTotp()"]';
    const confirmButton = document.querySelector(selector) as HTMLElement | null;

    if (!confirmButton) return; // 버튼을 못찾아버림.

    confirmButton.style.backgroundColor = '#FF69B4'
    confirmButton.textContent = '자동 인증 됨'
}

async function main () {
    console.info('contentScript is running')

    const OTP_CODE : string | null = await createGetOTPCycle();
    if (!OTP_CODE) return; //OTP가 무슨연유에서 인지 못가져옴.

    const inputBoxName = 'otpNum';
    const otpInput = document.querySelector<HTMLInputElement>(`input[name="${inputBoxName}"]`);
    if (!otpInput) return;

    otpInput.value = OTP_CODE;
    changeConfirmButtonState();
}

main()