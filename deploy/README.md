# 배포

`main`에 push 되면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 서버의 `/opt/ecoguard-web/releases/<커밋>`에 올리고 `current` 링크를 바꿉니다.
웹 화면은 정적 파일이라 서버 재시작 없이 바로 바뀝니다. 이전 릴리스는 3개까지 남아 실패하면 자동으로 되돌립니다.

## GitHub 설정

Variables (비밀값 아님, 빌드 때 JS에 포함됨)

- `VITE_API_BASE_URL`: `https://ecoguard.https.gsmsv.site/api/v1`
- `VITE_GSM_CLIENT_ID`: dataGSM 클라이언트 ID

Secrets (서버 저장소와 같은 값)

- `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`

## 서버 최초 1회 설정

```bash
sudo mkdir -p /opt/ecoguard-web/releases
sudo chown -R <SSH_USER>: /opt/ecoguard-web

# 첫 화면이 비어 있어도 서비스가 뜨도록 빈 릴리스를 만든다
mkdir -p /opt/ecoguard-web/releases/init
ln -sfn releases/init /opt/ecoguard-web/current

# deploy/ecoguard-web.service 의 User= 를 <SSH_USER>로 바꾼 뒤
sudo cp deploy/ecoguard-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ecoguard-web
```

gsmsv에서 `ecoguard-web` 서브도메인을 내부 포트 `3000`으로 연결해 둡니다.
