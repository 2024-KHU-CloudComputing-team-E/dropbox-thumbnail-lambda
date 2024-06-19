import AWS from "aws-sdk";
import sharp from "sharp";
import axios from "axios";

const s3 = new AWS.S3();

export const handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  try {
    // S3에서 이미지 가져오기
    const s3Object = await s3.getObject({ Bucket: bucket, Key: key }).promise();

    // 썸네일 생성
    const thumbnail = await sharp(s3Object.Body)
      .resize({ width: 128, height: 128 })
      .toBuffer();

    // EC2 서버로 POST 요청 보내기
    const ec2Endpoint =
      "http://instabox-alb-00-912203470.us-east-1.elb.amazonaws.com/api/thumbnail"; // EC2 인스턴스의 엔드포인트
    const postData = {
      image: thumbnail.toString("base64"), // 이미지를 base64 문자열로 변환하여 전송
      s3Key: key, // S3 객체의 키 정보 추가
    };

    await axios.post(ec2Endpoint, postData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return { statusCode: 200, body: "Thumbnail created and sent to EC2" };
  } catch (error) {
    console.error(`Error processing s3 obj ${key}: `, error);
    return { statusCode: 500, body: "Error creating or sending thumbnail" };
  }
};
