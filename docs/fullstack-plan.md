# 포트폴리오 풀스택 전환 계획

> 작성일 2026-10-04 · 상태 **계획 중** (아래 [결정이 필요한 것](#9-결정이-필요한-것) 참고)

## 1. 현재 상태

- **프론트엔드**: Next.js 16 + React 19. 전체 화면 캔버스 하나에 점(파티클) 5천~1만 1천 개를 그리고, 스크롤하면 섹션마다 점들이 다른 모양으로 바뀌는 구조예요.
- **서버 쪽 코드**: 연락 폼 Server Action 하나(`app/actions/contact.ts`, Resend로 이메일 발송)와 OG 이미지 생성 정도뿐이에요.
- **없는 것**: 데이터베이스, 별도 API, 데이터 저장, 로깅, 요청 제한(rate limiting). 백엔드는 사실상 처음부터 만들어야 해요.

## 2. 목표

1. 프론트엔드와 백엔드를 모두 갖춘 **풀스택 프로젝트**로 만들기
2. 방문자가 나에 대해 물어볼 수 있는 **AI 채팅** 추가 (오픈소스 LLM + RAG)
3. **Docker, Kubernetes, Prometheus, Grafana** 사용
4. **집에 있는 Windows PC**에서 직접 호스팅

## 3. 하드웨어

| 용도 | 장비 | 비고 |
|---|---|---|
| 개발 | MacBook (Apple M1, RAM 16GB) | Docker Desktop에 8GB 할당. Docker 안에서는 GPU를 쓸 수 없음 |
| 운영 | Windows PC (RTX 5070 Ti 16GB VRAM, Ryzen 9 9000) | RAM 미정 |

처음에는 Mac에서 호스팅하는 방안도 검토했어요. 그런데 Mac의 Docker와 Kubernetes는 Linux VM 안에서 돌아서 M1 GPU를 쓸 수 없어요. 그래서 LLM이 CPU로만 돌아 느려지고, RAM 16GB도 부족해요. 결국 **운영은 GPU가 있는 PC, 개발은 Mac**으로 나누기로 했어요.

## 4. 최종 아키텍처

```
Mac (개발)                               홈 서버 PC (운영)
─────────────────                       ───────────────────────────────────
pnpm dev + FastAPI       git push       k3s
Compose: Postgres       ─────────→      ├─ cloudflared → ingress ─┬─ / → web (Next.js)
Ollama/llama.cpp        GitHub Actions  │                          └─ /api → api (FastAPI)
(Qwen3.5-4B GGUF)       amd64 이미지 빌드├─ postgres + pgvector
                        → GHCR          ├─ vLLM: Qwen3.5-4B (RTX 5070 Ti)
                                        ├─ ingest Job (콘텐츠 임베딩, CPU)
                                        └─ Prometheus + Grafana + DCGM Exporter
```

## 5. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프론트엔드 | Next.js (기존 코드 유지) | 이미 완성도가 높아요. 채팅 UI만 추가해요 |
| 백엔드 | **Python + FastAPI** (확정 전) | RAG와 LLM 도구가 대부분 Python 기반이고, ML 경력과도 잘 맞아요 |
| DB | **Postgres + pgvector** | 연락 메시지, 채팅 로그, 임베딩을 DB 하나에 저장해요 |
| LLM | **Qwen3.5-4B** (HuggingFace) | Apache 2.0 라이선스이고, VRAM 16GB에 여유 있게 들어가요 |
| LLM 서빙 | **vLLM** | 동시 요청을 묶어서 처리하고, Prometheus 메트릭을 기본 제공하고, OpenAI 호환 API를 써요 |
| 임베딩 | **Qwen3-Embedding-0.6B** (CPU) | 같은 계열 모델이고, GPU를 vLLM 혼자 쓰게 할 수 있어요 |
| 컨테이너 | Docker | Next.js는 standalone 빌드, FastAPI는 별도 이미지로 만들어요 |
| 오케스트레이션 | **k3s** | 서버 한 대에서 돌리기 좋은 가벼운 Kubernetes예요 |
| GPU | NVIDIA GPU Operator | Kubernetes가 GPU를 인식하고 Pod에 할당하게 해줘요 |
| 모니터링 | kube-prometheus-stack + **DCGM Exporter** | 클러스터, API, LLM, GPU 상태를 Grafana 대시보드 하나에서 봐요 |
| CI/CD | GitHub Actions → GHCR (+ 선택 사항으로 Argo CD) | Mac(ARM)과 PC(x86)는 CPU 구조가 달라서 CI에서 `linux/amd64` 이미지를 빌드해요 |
| 외부 공개 | **Cloudflare Tunnel** | 공유기 포트를 열지 않아도 되고, 집 IP가 노출되지 않고, IP가 바뀌어도 동작해요 |
| 원격 관리 | **Tailscale** | Mac에서 PC로 `ssh`와 `kubectl`을 써요 |

## 6. 백엔드 API

- `POST /api/chat`: RAG로 관련 내용을 찾아 답변을 스트리밍하고, 출처도 함께 보여줘요
- `POST /api/contact`: 연락 메시지를 DB에 저장하고 이메일도 보내요. 지금의 Server Action을 대체해요
- 방문자별 요청 제한, 동시 처리 수 제한, 채팅 로그 저장 (채팅이 기록된다는 사실을 방문자에게 알려야 해요)
- 직접 정의한 Prometheus 메트릭: 첫 토큰까지 걸린 시간, 초당 토큰 수, 검색 지연 시간, 대기열 길이

## 7. LLM과 RAG

### Qwen3.5-4B 기본 정보

- 일반(dense) 4B 모델이에요. Linear attention 3층과 full attention 1층이 반복되는 하이브리드 구조라서 KV 캐시를 적게 써요.
- 멀티모달 모델이라 vision encoder가 들어 있어요.
- 컨텍스트는 기본 262K 토큰이에요.
- **thinking 모드가 기본으로 켜져 있어요.**
- 라이선스는 Apache 2.0이고, vLLM 0.17.0 이상이 필요해요.

### 서빙 설정

```bash
vllm serve Qwen/Qwen3.5-4B \
  --max-model-len 16384 \
  --reasoning-parser qwen3 \
  --default-chat-template-kwargs '{"enable_thinking": false}' \
  --language-model-only
```

- **thinking 끄기**: 답변이 빨리 시작되고, 생각 과정이 화면에 새어 나오지 않아요.
- **`--max-model-len 16384`**: RAG 프롬프트에는 이 정도면 충분하고, 남는 메모리를 KV 캐시에 써요.
- **`--language-model-only`**: 텍스트 채팅만 하니까 vision encoder를 올리지 않아요. 서드파티 모델 카드에서 확인한 플래그라서, 세팅할 때 vLLM 문서로 다시 확인해야 해요.
- **정밀도**: BF16 원본(약 8.8GB)을 그대로 써요. 4B 모델은 양자화하면 품질 손실이 상대적으로 커요. FP8(약 5.65GB)은 서드파티 버전만 확인했어요.
- **샘플링**: Qwen 권장값(thinking을 끈 일반 대화) `temperature 0.7, top_p 0.8, top_k 20, presence_penalty 1.5`에서 시작해요. RAG 답변은 temperature를 조금 낮춰볼 수 있어요.
- **이미지**: Blackwell(RTX 50 시리즈)용 CUDA 12.8 이상이 들어간 최신 `vllm/vllm-openai` 이미지를 써요.

### RAG 파이프라인

1. **수집**: `lib/content.ts`, `lib/case-studies.ts`, 이력서, 프로젝트 README
2. **임베딩**: Kubernetes Job이 콘텐츠를 잘게 나누고(chunking) Qwen3-Embedding-0.6B(CPU)로 임베딩해서 pgvector에 저장해요. 콘텐츠가 바뀌면 다시 실행해요
3. **검색**: 질문을 임베딩한 뒤 비슷한 내용 상위 k개를 골라요. 나중에 Qwen3-Reranker-0.6B를 추가할 수 있어요
4. **답변**: 검색된 내용 안에서만 답하고, 출처를 표시하고, 근거가 없으면 모른다고 답해요. 주제에서 벗어난 질문은 거절하고, 실제 동작을 하는 도구(tool)는 주지 않아요
5. **평가**: 나에 대한 질문과 정답 30~50개로 평가 세트를 만들어, 프롬프트나 검색 설정을 바꿀 때마다 품질을 확인해요

### 개발 환경

Mac에서는 Qwen3.5-4B GGUF 양자화 버전을 Ollama나 llama.cpp로 돌려요. Qwen3.5는 새 아키텍처라서 설치할 때 Ollama 지원 여부를 먼저 확인하고, 지원하지 않으면 llama.cpp나 MLX를 써요. 모두 OpenAI 호환 API라서 API 코드는 주소만 바꾸면 돼요.

## 8. 진행 단계

| 단계 | 내용 | 작업 장소 |
|---|---|---|
| 1. 컨테이너화 | Next.js와 FastAPI용 Dockerfile, Compose 파일 작성 | Mac |
| 2. 백엔드 | Postgres + pgvector와 마이그레이션 구성, 연락 폼을 API로 이전 | Mac |
| 3. RAG + 채팅 | 로컬 LLM 설치, 임베딩 파이프라인과 `/api/chat` 구현, 평가 세트 작성, 사이트 스타일에 맞춘 채팅 UI 제작 (아이콘은 `reicon-react`만 사용) | Mac |
| 4. 서버 준비 | OS 설치, NVIDIA 드라이버, k3s, GPU Operator, Tailscale 설정 | PC |
| 5. 배포 | Kubernetes manifest 또는 Helm chart 작성, Secret 설정, CI에서 이미지 빌드, vLLM 배포 | PC |
| 6. 모니터링 | Prometheus, Grafana, DCGM 설치와 대시보드 구성 | PC |
| 7. 공개 | Cloudflare Tunnel과 도메인 연결, 자동 시작과 절전 해제 설정 | PC |

1~3단계는 Kubernetes 없이도 동작해요. 앱을 먼저 완성한 다음 인프라를 올리는 순서예요.

## 9. 결정이 필요한 것

- [ ] **PC 운영 방식**: 서버 전용 Ubuntu(추천)로 쓸지, 평소 쓰는 Windows를 유지하고 WSL2에서 돌릴지
- [ ] **PC RAM 용량**: 32GB 이상이면 여유로워요
- [ ] **백엔드 언어**: Python/FastAPI로 확정할지

## 10. 주의할 점

- **RTX 5070 Ti는 최신 아키텍처(Blackwell)라서** CUDA 12.8 이상이 필요해요. 오래된 vLLM이나 PyTorch 이미지는 동작하지 않아요.
- **Kubernetes는 GPU 1장을 Pod 하나에만 통째로 할당해요.** GPU를 나눠 쓰려면 GPU Operator의 time-slicing을 따로 설정해야 해요. 그래서 임베딩은 CPU에서 돌려요.
- **WSL2에서는** Kubernetes의 GPU 연동이 까다롭고, DCGM(GPU 모니터링)도 대개 지원되지 않아요.
- **4B 모델은 할루시네이션이 잦아요.** 근거 기반 답변, 출처 표시, 평가 세트가 꼭 필요해요.
- **집 서버라서** PC가 꺼지거나 인터넷이 끊기면 사이트도 내려가요. 정전, Windows 업데이트로 인한 재부팅, 집 회선의 업로드 속도도 고려해야 해요.
- **공개 채팅에는** 악용 시도가 들어와요. 요청 제한, 답변 길이 제한, 주제 제한을 공개 전에 반드시 넣어야 해요.

## 참고 자료

- [Qwen/Qwen3.5-4B 모델 카드](https://huggingface.co/Qwen/Qwen3.5-4B)
- [Qwen3.5-4B config.json](https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/config.json)
- [vLLM Recipes: Qwen3.5-4B](https://recipes.vllm.ai/Qwen/Qwen3.5-4B)
- [Hob-forge/Qwen3.5-4B-FP8 (서드파티 FP8 양자화)](https://huggingface.co/Hob-forge/Qwen3.5-4B-FP8)
