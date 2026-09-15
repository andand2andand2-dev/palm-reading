require("dotenv").config();

const express = require("express");
const multer = require("multer");

const app = express();


// =========================
// Gemini API 키 확인
// =========================

if (!process.env.GEMINI_API_KEY) {

    console.log(
        "Gemini API 키를 찾을 수 없습니다."
    );

    process.exit(1);

}

console.log(
    "Gemini API 키 불러오기 성공"
);


// =========================
// 사진 업로드 설정
// =========================

const storage =
    multer.memoryStorage();


const upload =
    multer({

        storage: storage,

        limits: {
            fileSize:
                8 * 1024 * 1024
        },

        fileFilter:
            function (
                req,
                file,
                callback
            ) {

                const allowedTypes = [

                    "image/jpeg",
                    "image/png",
                    "image/webp"

                ];


                if (
                    allowedTypes.includes(
                        file.mimetype
                    )
                ) {

                    callback(
                        null,
                        true
                    );

                } else {

                    callback(
                        new Error(
                            "JPG, PNG, WEBP 사진만 사용할 수 있습니다."
                        )
                    );

                }

            }

    });


// =========================
// index.html 보여주기
// =========================

app.use(
    express.static(__dirname)
);


// =========================
// 기다리는 함수
// =========================

function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


// =========================
// Gemini 요청 함수
// =========================

async function askGemini(
    base64Image,
    mimeType,
    prompt
) {

    const delays = [

        0,
        1500,
        3000,
        6000

    ];


    let lastError = null;


    for (
        let i = 0;
        i < delays.length;
        i++
    ) {

        if (
            delays[i] > 0
        ) {

            console.log(
                `${delays[i] / 1000}초 후 다시 시도합니다...`
            );


            await wait(
                delays[i]
            );

        }


        console.log(
            `Gemini 요청 ${i + 1}/${delays.length}`
        );


        const response =
            await fetch(

                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",

                {

                    method:
                        "POST",


                    headers: {

                        "Content-Type":
                            "application/json",

                        "x-goog-api-key":
                            process.env
                                .GEMINI_API_KEY

                    },


                    body:
                        JSON.stringify({

                            contents: [

                                {

                                    parts: [

                                        {

                                            inlineData: {

                                                mimeType:
                                                    mimeType,

                                                data:
                                                    base64Image

                                            }

                                        },


                                        {

                                            text:
                                                prompt

                                        }

                                    ]

                                }

                            ]

                        })

                }

            );


        const data =
            await response.json();


        if (
            response.ok
        ) {

            return data;

        }


        lastError =
            data;


        console.log(
            "Gemini 오류 상태:",
            response.status
        );


        if (
            response.status !== 429
            &&
            response.status < 500
        ) {

            break;

        }

    }


    throw new Error(
        JSON.stringify(
            lastError
        )
    );

}


// =========================
// 손금 분석 API
// =========================

app.post(

    "/upload",

    upload.single(
        "photo"
    ),

    async function (
        req,
        res
    ) {

        try {

            // 사진 확인

            if (
                !req.file
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "손바닥 사진을 먼저 올려주세요."

                    });

            }


            // 손 정보 받기

            const hand =
                req.body.hand;


            const dominantHand =
                req.body
                    .dominantHand;


            if (
                !hand
                ||
                !dominantHand
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "손 정보를 다시 선택해주세요."

                    });

            }


            // 한글로 변환

            const handKorean =
                hand === "left"
                    ? "왼손"
                    : "오른손";


            const dominantKorean =
                dominantHand === "left"
                    ? "왼손잡이"
                    : "오른손잡이";


            console.log(
                "손금 분석 요청 시작"
            );


            // 사진을 Base64로 변환

            const base64Image =
                req.file.buffer
                    .toString(
                        "base64"
                    );


            // =========================
            // Gemini 프롬프트
            // =========================

            const prompt = `

이 손바닥 사진을 자세히 관찰해서
손금의 특징을 구체적으로 분석해줘.

사진 속 손:
${handKorean}

평소 주로 사용하는 손:
${dominantKorean}


중요 규칙:

1.
사진에서 실제로 보이는 내용만 설명해.

2.
사진에서 확인하기 어려운 부분은
억지로 추측하지 말고

"사진상 확실하지 않음"

이라고 설명해.

3.
누구에게나 적용할 수 있는
두루뭉술한 성격 설명은 피해야 해.

반드시 사진에서 확인되는
손금의 모양과 특징을 먼저 설명해.

4.
다음 네 가지 주요 선을 각각 분석해.

- 감정선
- 두뇌선
- 생명선
- 운명선

5.
각 선에서 가능한 경우
다음 특징을 구체적으로 확인해.

- 선이 얼마나 선명한지
- 길이가 긴지 짧은지
- 어디에서 시작하는지
- 어디까지 이어지는지
- 직선인지 곡선인지
- 위쪽 또는 아래쪽으로 향하는지
- 중간에 끊어진 부분이 있는지
- 선 끝이 갈라져 있는지
- 작은 가지선이 있는지
- 다른 주요 선과 교차하는지
- 다른 선과 가까이 붙어 있는 부분이 있는지

6.
각 손금은 반드시

관찰:
해석 방향:

두 부분으로 나누어서 설명해.


예시:

관찰:
감정선이 비교적 길게 이어지고,
끝부분이 검지와 중지 사이 방향으로
완만하게 올라가는 모습이 보입니다.

해석 방향:
손금 풀이에서는 이런 형태를
감정적인 판단과 현실적인 판단 사이에서
균형을 중시하는 방향으로 해석하기도 합니다.


7.
"해석 방향"에서는
앞에서 실제로 관찰한 특징과
직접 연결되는 내용만 설명해.


8.
다음 내용은 절대 하지 마.

- 실제 수명 예측
- 사망 시기 예측
- 질병 진단
- 건강 상태 판단
- 정신질환 판단
- 임신 여부 판단
- 미래가 확정되어 있다는 표현
- 정확한 결혼 시기 예측
- 정확한 재산 규모 예측


다음 형식으로 한국어로 답해.


[사진 상태]

사진의 선명도와
손금 분석이 가능한 상태인지 설명.


[감정선]

관찰:

해석 방향:


[두뇌선]

관찰:

해석 방향:


[생명선]

관찰:

해석 방향:


[운명선]

관찰:

해석 방향:


[손금의 조합]

감정선, 두뇌선, 생명선, 운명선이
서로 어떤 형태로 조합되어 있는지
사진에서 실제로 확인되는 특징을 설명.


[눈에 띄는 특징]

이 손바닥에서
가장 눈에 띄는 특징 3가지를
구체적으로 정리.


[전체 요약]

위에서 관찰한 내용들을 바탕으로
이 손바닥의 손금 특징을 정리.


마지막에는 반드시 다음 문장을 적어.

손금 풀이는 과학적 진단이나 미래 예측이 아닌 오락적 해석입니다.

`;


            // =========================
            // Gemini 분석 요청
            // =========================

            const geminiData =
                await askGemini(

                    base64Image,

                    req.file
                        .mimetype,

                    prompt

                );


            const parts =
                geminiData
                    ?.candidates?.[0]
                    ?.content?.parts;


            if (
                !parts
            ) {

                console.log(
                    "Gemini 응답:"
                );


                console.log(
                    JSON.stringify(
                        geminiData,
                        null,
                        2
                    )
                );


                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "손금 분석 결과가 없습니다."

                    });

            }


            const analysis =
                parts

                    .filter(
                        part =>
                            part.text
                    )

                    .map(
                        part =>
                            part.text
                    )

                    .join(
                        "\n"
                    );


            if (
                !analysis
            ) {

                return res
                    .status(500)
                    .json({

                        success:
                            false,

                        message:
                            "손금 분석 결과를 읽지 못했습니다."

                    });

            }


            console.log(
                "손금 분석 완료"
            );


            // 결과 보내기

            res.json({

                success:
                    true,

                analysis:
                    analysis

            });


        } catch (
            error
        ) {

            console.log(
                "최종 Gemini 오류:"
            );


            console.log(
                error
            );


            res
                .status(500)
                .json({

                    success:
                        false,

                    message:
                        "현재 손금 분석 서버가 혼잡합니다. 잠시 후 다시 시도해주세요."

                });

        }

    }

);


// =========================
// 서버 실행
// =========================

// Render에서는 PORT를 자동으로 정해줌
// 내 컴퓨터에서는 3000 사용

const PORT =
    process.env.PORT
    ||
    3000;


app.listen(

    PORT,

    function () {

        console.log(
            "손금 서버가 실행되었습니다."
        );


        console.log(
            `PORT: ${PORT}`
        );

    }

);