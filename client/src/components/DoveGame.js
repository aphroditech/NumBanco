import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import Phaser from "phaser";
import DoveControlPanel from "./DoveGame/DoveControlPanel";
import { getDovePrefix, getDifficultyKey, checkDoveWin, getDoveEarnings, reportDoveFail } from "action/DoveActions";
import WinFireworksEffect from "components/Effects/WinFireworksEffect";
import { toast } from "react-toastify";
import { getUserData } from "action";

const GAME_WIDTH = 1280
const GAME_HEIGHT = 720

const DEFAULT_PARAMS = { a: 0.2, b: 0.05 }

function getMultiplier(step, a, b) {
    if (step <= 1) return 0.5
    if (step <= 2) return 1
    const s = step - 2
    return 1 + a * s + b * s * s
}

function DoveGame() {

    const dispatch = useDispatch()
    const dispatchRef = useRef(dispatch)
    dispatchRef.current = dispatch
    const gameRef = useRef(null)
    const multiplierParamsRef = useRef({ ...DEFAULT_PARAMS })
    const prefixDataRef = useRef(null)
    const winModeRef = useRef("multiplier")
    const betAmountRef = useRef(0.1)
    const [gameStarted, setGameStarted] = useState(false)
    const [showSplash, setShowSplash] = useState(true)
    const [showBlackOverlay, setShowBlackOverlay] = useState(false)
    const [overlayFadeOut, setOverlayFadeOut] = useState(false)
    const [loadProgress, setLoadProgress] = useState(0)
    const [showNewRound, setShowNewRound] = useState(false)
    const gameStartedRef = useRef(false)
    const [step, setStep] = useState(0)
    const [canMove, setCanMove] = useState(false)
    const nextStepResultRef = useRef(null)
    const difficultyRef = useRef("easy")
    const [winFireworks, setWinFireworks] = useState({ visible: false, amount: 0 })
    const winFireworksTimeoutRef = useRef(null)

    useEffect(() => {
        let mounted = true
        let resizeObserver = null
        let container = null

        const handleResize = () => {
            if (gameRef.current && !gameRef.current.sys?.isDestroyed) {
                gameRef.current.scale.refresh()
            }
        }

        const initGame = async () => {
            try {
                await document.fonts.load("bold 20px Orbitron")
                if (!mounted) return
            } catch (_) {}
            if (!mounted) return

        let step = 0
        let dove
        let cars = []
        let laneCenters = []
        let happyToIdleTimer = null

        let stepText
        let multiplierText
        let failedText
        let crashedImage
        let cashOutText

        let gameOver = false
        let canMove = true

        const laneWidth = 120
        const totalLanes = 20

        const villageWidth = 220
        const grassWidth = 20

        const roadStartX = villageWidth + grassWidth

        const bubbleY = GAME_HEIGHT / 2
        const doveY = bubbleY - 30
        const stopOffset = 180

        const carSpeed = 440

        getDovePrefix().then((data) => {
            if (data) {
                prefixDataRef.current = data
                const easy = data.easy || DEFAULT_PARAMS
                const a = easy.a ?? 0.2
                const b = easy.b ?? 0.05
                multiplierParamsRef.current = { a, b }
                if (gameRef.current?.updateMultiplierParams) {
                    gameRef.current.updateMultiplierParams(a, b)
                }
            }
        })

        const config = {
            type: Phaser.AUTO,
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            parent: "dove-game-container",
            audio: {
                noAudio: true,
            },
            backgroundColor: "#2c2f3a",
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: { preload, create, update }
        }

        const game = new Phaser.Game(config)
        gameRef.current = game
        game.checkDoveWinFn = (data) => checkDoveWin(data, dispatchRef.current)
        game.getDoveEarningsFn = (data) => getDoveEarnings(data, dispatchRef.current)
        game.reportDoveFailFn = (data) => reportDoveFail(data)

        function preload() {

            this.load.image("dove", "/assets/dove.PNG")
            for (let i = 1; i <= 6; i++) {
                this.load.image("idle" + i, "/assets/idle" + i + ".png")
                this.load.image("jump" + i, "/assets/jump" + i + ".png")
                this.load.image("happy" + i, "/assets/happy" + i + ".png")
                this.load.image("panic" + i, "/assets/panic" + i + ".png")
            }

            this.load.image("village", "/assets/village.png")
            this.load.image("grass", "/assets/grass.png")
            this.load.image("bubble", "/assets/bubble.png")
            this.load.image("winbubble", "/assets/winbubble.png")
            this.load.image("crashed", "/assets/crashed.png")

            this.load.image("car1", "/assets/car1.png")
            this.load.image("car2", "/assets/car2.png")
            this.load.image("car3", "/assets/car3.png")
            this.load.image("truck", "/assets/truck.png")
            this.load.image("carrot", "/assets/carrot.png")

        }

        function create() {

            const scene = this
            const roadHeight = scene.scale.height

            const worldWidth =
                villageWidth +
                grassWidth +
                totalLanes * laneWidth +
                grassWidth +
                villageWidth

            scene.cameras.main.setBounds(0, 0, worldWidth, roadHeight)

            scene.add.image(villageWidth / 2, roadHeight / 2, "village")
                .setDisplaySize(villageWidth, roadHeight)

            const leftGrass = scene.add.image(
                villageWidth + grassWidth / 2,
                roadHeight / 2,
                "grass"
            )

            leftGrass.setDisplaySize(roadHeight, grassWidth)
            leftGrass.setAngle(90)

            scene.add.rectangle(
                roadStartX + (totalLanes * laneWidth) / 2,
                roadHeight / 2,
                totalLanes * laneWidth,
                roadHeight,
                0x505566
            )

            for (let i = 1; i < totalLanes; i++) {

                const x = roadStartX + i * laneWidth
                const g = scene.add.graphics()

                g.lineStyle(4, 0xffffff, 0.8)

                for (let y = 0; y < roadHeight; y += 40) {
                    g.lineBetween(x, y, x, y + 20)
                }

            }

            const rightGrass = scene.add.image(
                roadStartX + totalLanes * laneWidth + grassWidth / 2,
                roadHeight / 2,
                "grass"
            )

            rightGrass.setDisplaySize(roadHeight, grassWidth)
            rightGrass.setAngle(-90)

            const rightVillage = scene.add.image(
                roadStartX + totalLanes * laneWidth + grassWidth + villageWidth / 2,
                roadHeight / 2,
                "village"
            )

            rightVillage.setDisplaySize(villageWidth, roadHeight)
            rightVillage.setFlipX(true)

            const carrotX = roadStartX + totalLanes * laneWidth + grassWidth + villageWidth / 2 - 70
            const carrotY = bubbleY

            const glow1 = scene.add.circle(carrotX, carrotY, 85, 0xfff5e6, 0.12)
            glow1.setDepth(14)
            scene.tweens.add({
                targets: glow1,
                scale: { from: 1, to: 1.25 },
                alpha: { from: 0.08, to: 0.18 },
                duration: 2200,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            })

            const glow2 = scene.add.circle(carrotX, carrotY, 55, 0xffe4b5, 0.18)
            glow2.setDepth(15)
            scene.tweens.add({
                targets: glow2,
                scale: { from: 1, to: 1.15 },
                alpha: { from: 0.12, to: 0.25 },
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            })

            const glow3 = scene.add.circle(carrotX, carrotY, 35, 0xffcc80, 0.22)
            glow3.setDepth(16)
            scene.tweens.add({
                targets: glow3,
                scale: { from: 1, to: 1.1 },
                alpha: { from: 0.15, to: 0.3 },
                duration: 1400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            })

            const carrot = scene.add.image(carrotX, carrotY, "carrot")
            carrot.setScale(0.22)
            carrot.setDepth(18)
            scene.tweens.add({
                targets: carrot,
                scale: { from: 0.21, to: 0.23 },
                duration: 2500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
                hold: 300
            })

            if (!scene.anims.exists("doveIdle")) {
                scene.anims.create({
                    key: "doveIdle",
                    frames: [
                        { key: "idle1" },
                        { key: "idle2" },
                        { key: "idle3" },
                        { key: "idle4" },
                        { key: "idle5" },
                        { key: "idle6" }
                    ],
                    frameRate: 8,
                    repeat: -1
                })
            }
            if (!scene.anims.exists("doveJump")) {
                scene.anims.create({
                    key: "doveJump",
                    frames: [
                        { key: "jump1" },
                        { key: "jump2" },
                        { key: "jump3" },
                        { key: "jump4" },
                        { key: "jump5" },
                        { key: "jump6" }
                    ],
                    frameRate: 8,
                    repeat: 0
                })
            }
            if (!scene.anims.exists("doveHappy")) {
                scene.anims.create({
                    key: "doveHappy",
                    frames: [
                        { key: "happy1" },
                        { key: "happy2" },
                        { key: "happy3" },
                        { key: "happy4" },
                        { key: "happy5" },
                        { key: "happy6" }
                    ],
                    frameRate: 8,
                    repeat: -1
                })
            }
            if (!scene.anims.exists("dovePanic")) {
                scene.anims.create({
                    key: "dovePanic",
                    frames: [
                        { key: "panic1" },
                        { key: "panic2" },
                        { key: "panic3" },
                        { key: "panic4" },
                        { key: "panic5" },
                        { key: "panic6" }
                    ],
                    frameRate: 10,
                    repeat: -1
                })
            }

            dove = scene.add.sprite(
                roadStartX - laneWidth / 2,
                doveY,
                "idle1"
            )

            dove.play("doveIdle")
            dove.setFlipX(true)
            dove.setScale(0.4)
            dove.setDepth(20)

            scene.bubbleTexts = []
            scene.bubbles = []
            scene.winBubbleLanes = new Set()
            for (let i = 1; i <= totalLanes; i++) {

                const laneCenter = roadStartX + i * laneWidth - laneWidth / 2
                laneCenters.push(laneCenter)

                const bubble = scene.add.image(
                    laneCenter,
                    bubbleY,
                    "bubble"
                )

                bubble.setScale(0.3)
                bubble.laneNum = i
                scene.bubbles.push(bubble)

                const { a, b } = multiplierParamsRef.current
                const m = getMultiplier(i, a, b)

                const bubbleText = scene.add.text(
                    laneCenter,
                    bubbleY,
                    m.toFixed(2) + "x",
                    {
                        fontFamily: "Orbitron, Arial Black, sans-serif",
                        fontSize: "20px",
                        fontStyle: "bold",
                        color: "#ffffff",
                        stroke: "#666666",
                        strokeThickness: 3
                    }
                )
                bubbleText.setOrigin(0.5, 0.5)
                bubbleText.laneNum = i
                bubbleText.defaultY = bubbleY
                bubbleText.defaultX = laneCenter
                scene.bubbleTexts.push(bubbleText)

            }

            const stepMultiplierStyle = {
                fontFamily: "Orbitron, Arial Black, sans-serif",
                fontSize: "28px",
                fontStyle: "bold",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
                shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 4 }
            }
            stepText = scene.add.text(
                20, 20, "Step:0",
                stepMultiplierStyle
            ).setScrollFactor(0).setScale(1).setDepth(101)

            multiplierText = scene.add.text(
                20, 60, "Multiplier:0.50x",
                {
                    ...stepMultiplierStyle,
                    fontSize: "32px",
                    color: "#ffd700",
                    stroke: "#b8860b"
                }
            ).setScrollFactor(0).setScale(1).setDepth(101)

            failedText = scene.add.text(
                GAME_WIDTH / 2, GAME_HEIGHT / 2, "FAILED",
                { fontSize: "80px", color: "#ff0000" }
            ).setOrigin(0.5).setScrollFactor(0)

            failedText.setVisible(false)
            if (cashOutText) cashOutText.setVisible(false)

            // Move up so the bottom control panel doesn't hide the crash graphic.
            crashedImage = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, "crashed")
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(200)
            crashedImage.setScale(0.8)
            crashedImage.setVisible(false)

            cashOutText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "",
                {
                    fontFamily: "Orbitron, Arial Black, sans-serif",
                    fontSize: "48px",
                    fontStyle: "bold",
                    color: "#00ff88",
                    stroke: "#000000",
                    strokeThickness: 4,
                    shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 6 }
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(210)
            cashOutText.setVisible(false)

            const barWidth = scene.scale.width / 3
            const barHeight = scene.scale.height / 18
            const barX = scene.scale.width / 2
            const barY = (scene.scale.height / 5) / 2 + barHeight / 2
            const stepBarContainer = scene.add.container(barX, barY)
            stepBarContainer.setScrollFactor(0)
            stepBarContainer.setDepth(100)
            stepBarContainer.setVisible(false)
            scene.stepBarContainer = stepBarContainer

            const endPadding = barWidth * 0.06
            const stepSpacing = (barWidth - 2 * endPadding) / (totalLanes + 1)
            const circleRadius = stepSpacing * 0.35
            const stepStartX = -barWidth / 2 + endPadding + stepSpacing / 2

            const barGlow = scene.add.graphics()
            barGlow.fillStyle(0xffd700, 0.15)
            barGlow.fillRoundedRect(-barWidth / 2 - 4, -barHeight / 2 - 4, barWidth + 8, barHeight + 8, (barHeight + 8) / 2)
            stepBarContainer.add(barGlow)

            const stepBarBg = scene.add.graphics()
            stepBarBg.fillStyle(0x0d1117, 0.95)
            stepBarBg.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2)
            stepBarBg.lineStyle(2, 0xffd700, 0.6)
            stepBarBg.strokeRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, barHeight / 2)
            stepBarContainer.add(stepBarBg)

            const trackLine = scene.add.graphics()
            trackLine.lineStyle(2, 0x2d3748, 0.8)
            trackLine.beginPath()
            trackLine.moveTo(stepStartX, 0)
            trackLine.lineTo(stepStartX + (totalLanes - 1) * stepSpacing, 0)
            trackLine.strokePath()
            stepBarContainer.add(trackLine)

            scene.stepBarCircles = []
            for (let i = 0; i < totalLanes; i++) {
                const cx = stepStartX + i * stepSpacing
                const circle = scene.add.circle(cx, 0, circleRadius, 0x4a5568)
                circle.stepIndex = i + 1
                circle.setStrokeStyle(2, 0x2d3748)
                circle.glow = scene.add.circle(cx, 0, circleRadius + 4, 0x4fc3f7, 0)
                circle.glow.setStrokeStyle(0)
                stepBarContainer.add(circle.glow)
                stepBarContainer.add(circle)
                scene.stepBarCircles.push(circle)
            }

            const starX = stepStartX + totalLanes * stepSpacing
            const starGlow = scene.add.circle(starX, 0, circleRadius * 1.8, 0xffd700, 0.25)
            stepBarContainer.add(starGlow)
            const starGraphics = scene.add.graphics()
            starGraphics.fillStyle(0xffd700, 1)
            starGraphics.fillCircle(starX, 0, circleRadius * 1.3)
            starGraphics.lineStyle(2, 0xffc107, 1)
            starGraphics.strokeCircle(starX, 0, circleRadius * 1.3)
            stepBarContainer.add(starGraphics)
            scene.stepBarStar = starGraphics

            game.updateStepBar = (currentStep, truckCrashStep) => {
                for (let i = 0; i < scene.stepBarCircles.length; i++) {
                    const circle = scene.stepBarCircles[i]
                    const stepNum = i + 1
                    const isNext = stepNum === currentStep + 1 && truckCrashStep == null
                    let newFill, newStroke
                    if (truckCrashStep != null && stepNum === truckCrashStep) {
                        newFill = 0xef4444
                        newStroke = 0xdc2626
                    } else if (stepNum <= (truckCrashStep ?? currentStep)) {
                        newFill = 0xffd700
                        newStroke = 0xffc107
                    } else if (isNext) {
                        newFill = 0x38bdf8
                        newStroke = 0x7dd3fc
                    } else {
                        newFill = 0x4a5568
                        newStroke = 0x2d3748
                    }
                    const colorChanged = (circle.lastFill !== newFill)
                    circle.lastFill = newFill

                    if (circle.glow) {
                        if (isNext) {
                            circle.glow.setVisible(true)
                            circle.glow.setFillStyle(0x38bdf8, 0.4)
                            circle.glow.setRadius(circleRadius + 5)
                            if (!circle.glow.pulseTween || !circle.glow.pulseTween.isPlaying()) {
                                circle.glow.pulseTween = scene.tweens.add({
                                    targets: circle.glow,
                                    alpha: { from: 0.4, to: 0.2 },
                                    duration: 600,
                                    yoyo: true,
                                    repeat: -1,
                                    ease: "Sine.easeInOut"
                                })
                            }
                        } else {
                            circle.glow.setVisible(false)
                            if (circle.glow.pulseTween) {
                                circle.glow.pulseTween.stop()
                                circle.glow.pulseTween = null
                            }
                        }
                    }

                    if (colorChanged) {
                        if (newFill === 0xffd700 || newFill === 0xef4444) {
                            scene.tweens.add({
                                targets: circle,
                                scale: { from: 1.35, to: 1 },
                                duration: 280,
                                ease: "Back.easeOut"
                            })
                        } else if (newFill === 0x38bdf8) {
                            scene.tweens.add({
                                targets: circle,
                                scale: { from: 1.2, to: 1 },
                                duration: 200,
                                ease: "Quad.easeOut"
                            })
                        }
                    }

                    circle.setFillStyle(newFill)
                    circle.setStrokeStyle(2, newStroke)
                }
            }

            const maxScrollX = Math.max(0, worldWidth - scene.scale.width)
            let isDragging = false
            let lastPointerX = 0

            const onPointerDown = (ptr) => {
                lastPointerX = ptr.x
                isDragging = false
            }

            const onPointerMove = (ptr) => {
                if (!ptr.isDown) return
                const dx = ptr.x - lastPointerX
                if (Math.abs(dx) > 5) {
                    isDragging = true
                    const cam = scene.cameras.main
                    cam.stopFollow()
                    const next = Phaser.Math.Clamp(cam.scrollX - dx, 0, maxScrollX)
                    cam.setScroll(next, 0)
                }
                lastPointerX = ptr.x
            }

            const onPointerUp = () => {
                if (!isDragging && gameOver === false && gameStartedRef.current && canMove && step < totalLanes) {
                    moveDove()
                }
                isDragging = false
            }

            const onPointerUpOutside = () => {
                isDragging = false
            }

            scene.input.on("pointerdown", onPointerDown)
            scene.input.on("pointermove", onPointerMove)
            scene.input.on("pointerup", onPointerUp)
            scene.input.on("pointerupoutside", onPointerUpOutside)

            for (let lane = 1; lane <= totalLanes; lane++) {
                scheduleTraffic(scene, lane)
            }

            game.updateMultiplierParams = (a, b) => {
                multiplierParamsRef.current = { a, b }
                game.updateBubbleDisplay()
            }

            game.startCameraIntro = (onComplete) => {
                const cam = scene.cameras.main
                const worldWidth = villageWidth + grassWidth + totalLanes * laneWidth + grassWidth + villageWidth
                const maxScrollX = Math.max(0, worldWidth - scene.scale.width)
                cam.stopFollow()
                cam.setScroll(0, 0)
                scene.stepBarContainer.setVisible(true)
                game.updateStepBar?.(0, null)
                scene.tweens.add({
                    targets: cam,
                    scrollX: maxScrollX,
                    duration: 800,
                    ease: "Sine.easeInOut",
                    onComplete: () => {
                        scene.time.delayedCall(1000, () => {
                            scene.tweens.add({
                                targets: cam,
                                scrollX: 0,
                                duration: 200,
                                ease: "Sine.easeInOut",
                                onComplete: () => {
                                    scene.cameras.main.startFollow(dove, true, 0.08, 0.08)
                                    onComplete?.()
                                }
                            })
                        })
                    }
                })
            }

            game.triggerMove = () => moveDove()

            game.handleCashOut = async () => {
                if (step < 1) return
                gameOver = true
                canMove = false
                game.onCanMoveChange?.(false)
                if (happyToIdleTimer) {
                    happyToIdleTimer.remove()
                    happyToIdleTimer = null
                }
                dove.setFlipX(true)
                dove.play("doveHappy")
                const bet = Number(betAmountRef.current || 0)
                const { a, b } = multiplierParamsRef.current
                const multiplier = getMultiplier(step, a, b)
                const cashOutAmount = bet * multiplier
                const earned = await game.getDoveEarningsFn?.({
                    bet,
                    multiplier,
                    level: step,
                    difficulty: difficultyRef.current
                })

                if (earned == null) {
                    toast.error("Cash out failed.");
                } else {
                    // Cash out should use the same "win" visuals.
                    if (scene?.bubbles && scene?.bubbleTexts && scene.winBubbleLanes) {
                        const idx = Math.max(0, Math.min(scene.bubbles.length - 1, step - 1))
                        game.updateStepBar?.(step, null)
                        scene.bubbles[idx].setTexture("winbubble")
                        scene.winBubbleLanes.add(step)
                        const bt = scene.bubbleTexts[idx]
                        bt?.setStyle({
                            fontFamily: "Orbitron, Arial Black, sans-serif",
                            fontSize: "20px",
                            fontStyle: "bold",
                            color: "#ffffff",
                            stroke: "#ffd700",
                            strokeThickness: 3
                        })
                    }

                    // Fireworks effect (same component used in other games).
                    setWinFireworks({ visible: true, amount: Number(cashOutAmount.toFixed(2)) })
                    if (winFireworksTimeoutRef.current) clearTimeout(winFireworksTimeoutRef.current)
                    winFireworksTimeoutRef.current = setTimeout(() => {
                        setWinFireworks({ visible: false, amount: 0 })
                        winFireworksTimeoutRef.current = null
                    }, 2200)

                    toast.success(`Cashed out! You won $${cashOutAmount.toFixed(2)}.`);
                    // Refresh notifications so the cash-out amount shows immediately
                    // in the Notifications panel (like other games).
                    getUserData(dispatchRef.current)
                }

                scene.time.delayedCall(1500, () => resetGame())
            }

            game.setCanMove = (val) => {
                canMove = val
                game.onCanMoveChange?.(val)
            }

            game.getStep = () => step
            game.getBetAmount = () => betAmountRef.current
            game.getCurrentMultiplier = () => {
                const { a, b } = multiplierParamsRef.current
                return getMultiplier(step, a, b)
            }
            game.onStepChange = (s) => setStep(s)
            game.onCanMoveChange = (val) => setCanMove(val)
            game.onGameReset = () => {
                gameStartedRef.current = false
                setGameStarted(false)
                setStep(0)
                setCanMove(false)
            }

            game.updateBubbleDisplay = () => {
                const { a, b } = multiplierParamsRef.current
                const winMode = winModeRef.current
                const bet = betAmountRef.current
                if (scene.bubbleTexts) {
                    for (let i = 0; i < scene.bubbleTexts.length; i++) {
                        const laneNum = i + 1
                        const m = getMultiplier(laneNum, a, b)
                        const text = winMode === "multiplier"
                            ? m.toFixed(2) + "x"
                            : (bet * m).toFixed(2)
                        scene.bubbleTexts[i].setText(text)
                        const isWin = scene.winBubbleLanes && scene.winBubbleLanes.has(laneNum)
                        scene.bubbleTexts[i].setStyle({
                            fontFamily: "Orbitron, Arial Black, sans-serif",
                            fontSize: "20px",
                            fontStyle: "bold",
                            color: "#ffffff",
                            stroke: isWin ? "#ffd700" : "#666666",
                            strokeThickness: 3
                        })
                    }
                }
                if (step > 0) {
                    const m = getMultiplier(step, a, b)
                    if (winMode === "multiplier") {
                        multiplierText.setText("Multiplier:" + m.toFixed(2) + "x")
                    } else {
                        multiplierText.setText("Win:" + (bet * m).toFixed(2))
                    }
                }
            }

        }

        function moveDove() {

            if (gameOver) return
            if (!gameStartedRef.current) return
            if (!canMove) return
            if (step >= totalLanes) return

            if (happyToIdleTimer) {
                happyToIdleTimer.remove()
                happyToIdleTimer = null
            }

            step++
            canMove = false
            game.onStepChange?.(step)
            game.onCanMoveChange?.(false)

            const scene = game.scene.scenes[0]

            dove.setFlipX(false)
            dove.play("doveJump")

            scene.tweens.add({
                targets: dove,
                x: dove.x + laneWidth,
                duration: 250,
                ease: "Power2",
                onComplete: () => {
                    const result = nextStepResultRef.current
                    const isTruck = result === 0
                    dove.setFlipX(true)
                    if (isTruck) {
                        dove.play("dovePanic")
                    } else {
                        dove.play("doveIdle")
                    }
                    if (step >= 2) {
                        const prevBt = scene.bubbleTexts[step - 2]
                        scene.tweens.add({
                            targets: prevBt,
                            x: prevBt.defaultX,
                            y: prevBt.defaultY,
                            duration: 300,
                            ease: "Power2"
                        })
                    }
                    const currBt = scene.bubbleTexts[step - 1]
                    const targetX = laneCenters[step - 1]
                    scene.tweens.add({
                        targets: currBt,
                        x: targetX,
                        y: doveY + 70,
                        duration: 300,
                        ease: "Power2"
                    })
                    spawnLaneVehicle(scene, step, result)

                    const { a, b } = multiplierParamsRef.current
                    const m = getMultiplier(step, a, b)
                    const winMode = winModeRef.current
                    const bet = betAmountRef.current
                    if (winMode === "multiplier") {
                        multiplierText.setText("Multiplier:" + m.toFixed(2) + "x")
                    } else {
                        multiplierText.setText("Win:" + (bet * m).toFixed(2))
                    }
                }
            })

            stepText.setText("Step:" + step)

            if (step >= 1) {
                scene.cameras.main.startFollow(dove, true, 0.08, 0.08)
            }

        }

        function spawnLaneVehicle(scene, lane, serverResult) {

            let vehicle
            if (serverResult === 0) {
                vehicle = "truck"
            } else {
                const normal = ["car1", "car2", "car3"]
                vehicle = normal[Math.floor(Math.random() * normal.length)]
            }

            spawnCar(scene, lane, vehicle)

        }

        function scheduleTraffic(scene, lane) {

            const delay = Phaser.Math.Between(1200, 3000)

            scene.time.addEvent({

                delay: delay,

                callback: () => {

                    if (lane !== step && lane !== step + 1 && lane !== step + 2) {

                        if (!cars.some(c => c.lane === lane)) {

                            const normal = ["car1", "car2", "car3"]
                            const vehicle = normal[Math.floor(Math.random() * normal.length)]

                            spawnCar(scene, lane, vehicle)

                        }

                    }

                    scheduleTraffic(scene, lane)

                }

            })

        }

        function spawnCar(scene, lane, type) {

            const laneCenter = laneCenters[lane - 1]

            const car = scene.add.image(
                laneCenter,
                -200,
                type
            )

            car.setScale(0.45)
            car.setAngle(90)

            car.speed = carSpeed
            car.lane = lane
            car.type = type
            car.isStopped = false

            cars.push(car)

        }

        function update() {

            if (gameOver) return

            cars.forEach(car => {

                const stopLine = bubbleY - stopOffset

                if (car.lane === step) {

                    if (car.type === "truck") {

                        car.y += car.speed * 0.016

                        if (Math.abs(car.y - bubbleY) < 20) {

                            fail()

                        }

                    } else {

                        if (car.y < stopLine) {

                            car.y += car.speed * 0.016

                        } else {

                            if (!car.isStopped) {

                                car.isStopped = true

                                const scene = game.scene.scenes[0]
                                game.updateStepBar?.(step, null)
                                scene.bubbles[step - 1].setTexture("winbubble")
                                scene.winBubbleLanes.add(step)
                                const bt = scene.bubbleTexts[step - 1]
                                bt.setStyle({ fontFamily: "Orbitron, Arial Black, sans-serif", fontSize: "20px", fontStyle: "bold", color: "#ffffff", stroke: "#ffd700", strokeThickness: 3 })

                                dove.setFlipX(true)
                                dove.play("doveHappy", false)
                                if (happyToIdleTimer) happyToIdleTimer.remove()
                                happyToIdleTimer = scene.time.delayedCall(2500, () => {
                                    happyToIdleTimer = null
                                    if (!gameOver) {
                                        dove.setFlipX(true)
                                        dove.play("doveIdle")
                                    }
                                })
                                const bet = betAmountRef.current
                                const { a, b } = multiplierParamsRef.current

                                const doEnableMove = () => {
                                    canMove = true
                                    game.onCanMoveChange?.(true)
                                    scene.tweens.add({
                                        targets: car,
                                        scaleX: car.scaleX * 1.03,
                                        scaleY: car.scaleY * 1.03,
                                        duration: 200,
                                        yoyo: true,
                                        repeat: -1
                                    })
                                }

                                if (step >= totalLanes) {
                                    doEnableMove()
                                } else {
                                    const nextLevel = step + 1
                                    const multiplier = getMultiplier(nextLevel, a, b)
                                    game.checkDoveWinFn?.({
                                        bet,
                                        level: nextLevel,
                                        multiplier,
                                        isStart: false
                                    }).then((res) => {
                                        if (res != null) nextStepResultRef.current = res
                                        doEnableMove()
                                    }).catch(() => doEnableMove())
                                }

                            }

                        }

                    }

                } else {

                    car.y += car.speed * 0.016

                }

                if (car.y > this.scale.height + 300) {

                    car.destroy()
                    cars = cars.filter(c => c !== car)

                }

            })

        }

        function fail() {

            gameOver = true

            const scene = game.scene.scenes[0]

            game.updateStepBar?.(step, step)

            failedText.setVisible(false)
            if (crashedImage) {
                // Instant show, then quick pop from 0.8 -> 0.9
                crashedImage.setVisible(true)
                scene.tweens.killTweensOf(crashedImage)
                crashedImage.setScale(0.8)
                scene.tweens.add({
                    targets: crashedImage,
                    scale: 0.9,
                    duration: 20,
                    ease: "Quad.easeOut",
                })
            }
            dove.setVisible(false)
            const bet = Number(betAmountRef.current || 0)
            toast.error(`Crashed! You lost $${bet.toFixed(2)}.`)
            if (winFireworksTimeoutRef.current) clearTimeout(winFireworksTimeoutRef.current)
            setWinFireworks({ visible: false, amount: 0 })
            const { a, b } = multiplierParamsRef.current
            const multiplier = getMultiplier(step, a, b)
            game.reportDoveFailFn?.({
                bet: betAmountRef.current,
                multiplier,
                level: step,
                difficulty: difficultyRef.current
            })

            scene.time.delayedCall(2000, () => {
                resetGame()
            })

        }

        function resetGame() {

            const scene = game.scene.scenes[0]

            if (happyToIdleTimer) {
                happyToIdleTimer.remove()
                happyToIdleTimer = null
            }

            cars.forEach(c => c.destroy())
            cars = []

            step = 0
            gameOver = false
            canMove = true

            dove.clearTint()
            dove.setVisible(true)
            if (crashedImage) crashedImage.setVisible(false)
            dove.x = roadStartX - laneWidth / 2
            dove.y = doveY
            dove.setFlipX(true)
            dove.play("doveIdle")

            if (scene.bubbles) {
                scene.bubbles.forEach(b => b.setTexture("bubble"))
            }
            if (scene.winBubbleLanes) scene.winBubbleLanes.clear()
            if (scene.bubbleTexts) {
                scene.bubbleTexts.forEach((bt, i) => {
                    bt.x = bt.defaultX
                    bt.y = bt.defaultY
                    bt.setStyle({ fontFamily: "Orbitron, Arial Black, sans-serif", fontSize: "20px", fontStyle: "bold", color: "#ffffff", stroke: "#666666", strokeThickness: 3 })
                })
            }

            stepText.setText("Step:0")
            multiplierText.setText("Multiplier:0.50x")

            failedText.setVisible(false)
            if (cashOutText) cashOutText.setVisible(false)
            if (winFireworksTimeoutRef.current) clearTimeout(winFireworksTimeoutRef.current)
            setWinFireworks({ visible: false, amount: 0 })

            game.updateStepBar?.(0, null)

            scene.cameras.main.stopFollow()
            scene.cameras.main.setScroll(0, 0)

            game.onStepChange?.(0)
            game.onGameReset?.()

        }

        container = document.getElementById("dove-game-container")
        resizeObserver = container
            ? new ResizeObserver(handleResize)
            : null
        if (resizeObserver && container) {
            resizeObserver.observe(container)
        }
        window.addEventListener("resize", handleResize)

        }

        initGame()

        return () => {
            mounted = false
            if (resizeObserver && container) {
                resizeObserver.unobserve(container)
            }
            window.removeEventListener("resize", handleResize)
            if (gameRef.current && !gameRef.current.sys?.isDestroyed) {
                gameRef.current.destroy(true)
            }
            gameRef.current = null
        }

    }, [])

    const handlePlay = async (config) => {
        const { amount: bet, difficulty, winMode } = config || {}
        const betAmount = parseFloat(bet) || 0.1
        if (betAmount < 0.1) return

        betAmountRef.current = betAmount
        difficultyRef.current = difficulty
        if (winMode !== undefined) winModeRef.current = winMode
        handleDifficultyChange(difficulty)

        const game = gameRef.current
        if (!game?.checkDoveWinFn) return

        const waitForReady = (maxMs = 5000) =>
            new Promise((resolve) => {
                if (game?.startCameraIntro) return resolve(true)
                const start = Date.now()
                const id = setInterval(() => {
                    if (gameRef.current?.startCameraIntro || Date.now() - start > maxMs) {
                        clearInterval(id)
                        resolve(!!gameRef.current?.startCameraIntro)
                    }
                }, 100)
            })

        if (!(await waitForReady())) return

        toast.info(`Dove started. Bet $${betAmount.toFixed(2)}.`)

        const { a, b } = multiplierParamsRef.current
        const multiplier = getMultiplier(1, a, b)
        const result = await game.checkDoveWinFn({
            bet: betAmount,
            level: 1,
            multiplier,
            isStart: true
        })
        if (result == null) return

        nextStepResultRef.current = result

        gameStartedRef.current = true
        setGameStarted(true)
        setStep(0)
        setCanMove(false)
        game.setCanMove?.(false)

        setShowNewRound(true)
        setTimeout(() => setShowNewRound(false), 2000)
        game.startCameraIntro(() => {
            setCanMove(true)
            game.setCanMove?.(true)
        })
    }

    const handleDifficultyChange = (difficulty) => {
        const key = getDifficultyKey(difficulty)
        const data = prefixDataRef.current
        const params = data?.[key] || DEFAULT_PARAMS
        const a = params.a ?? 0.2
        const b = params.b ?? 0.05
        multiplierParamsRef.current = { a, b }
        if (gameRef.current?.updateMultiplierParams) {
            gameRef.current.updateMultiplierParams(a, b)
        }
    }

    useEffect(() => {
        const start = Date.now()
        const progressDuration = 2000
        const totalDuration = 3000
        let rafId
        let timeoutId
        let fadeTimeoutId
        const tick = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(100, (elapsed / progressDuration) * 100)
            setLoadProgress(progress)
            if (elapsed < totalDuration) {
                rafId = requestAnimationFrame(tick)
            } else {
                setLoadProgress(100)
                setShowSplash(false)
                setShowBlackOverlay(true)
                timeoutId = setTimeout(() => {
                    setOverlayFadeOut(true)
                    fadeTimeoutId = setTimeout(() => {
                        setShowBlackOverlay(false)
                        setOverlayFadeOut(false)
                    }, 500)
                }, 500)
            }
        }
        rafId = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(rafId)
            if (timeoutId) clearTimeout(timeoutId)
            if (fadeTimeoutId) clearTimeout(fadeTimeoutId)
        }
    }, [])

    const handleDisplayModeChange = ({ winMode, amount }) => {
        if (winMode !== undefined) winModeRef.current = winMode
        if (amount !== undefined) betAmountRef.current = typeof amount === "number" ? amount : parseFloat(amount) || 0.1
        if (gameRef.current?.updateBubbleDisplay) {
            gameRef.current.updateBubbleDisplay()
        }
    }

    return (
        <div
            style={{
                position: "relative",
                display: "block",
                width: "100%",
                maxWidth: "1520px",
                margin: "0 auto",
                aspectRatio: "16/9",
                minHeight: "250px",
                maxHeight: "min(820px, 88vh)",
                minWidth: 0,
                overflow: "hidden",
                borderRadius: "8px",
                touchAction: "manipulation",
                userSelect: "none",
                WebkitUserSelect: "none"
            }}
        >
            <WinFireworksEffect
                isVisible={winFireworks.visible}
                totalEarn={winFireworks.amount}
                duration={2200}
            />
            {showNewRound && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 15,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        paddingTop: "13.33%",
                        pointerEvents: "none"
                    }}
                >
                    <img
                        src="/assets/newround.png"
                        alt=""
                        style={{
                            maxWidth: "60%",
                            maxHeight: "40%",
                            objectFit: "contain",
                            animation: "newroundSlide 2s ease-in-out forwards"
                        }}
                    />
                </div>
            )}
            <style>{`
                @keyframes newroundSlide {
                    0% { transform: translateX(-120%); }
                    40% { transform: translateX(0); }
                    52.5% { transform: translateX(8px); }
                    65% { transform: translateX(-8px); }
                    77.5% { transform: translateX(8px); }
                    90% { transform: translateX(0); }
                    100% { transform: translateX(120%); }
                }
            `}</style>
            <div
                id="dove-game-container"
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: "100%",
                    height: "100%"
                }}
            />
            {showSplash && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 5,
                        backgroundImage: "url('/assets/splash.png')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        paddingBottom: "8%"
                    }}
                >
                    <div style={{ color: "#fff", fontSize: "18px", fontWeight: "bold", marginBottom: "12px", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                        Loading... {Math.round(loadProgress)}%
                    </div>
                    <div
                        style={{
                            width: "60%",
                            maxWidth: "400px",
                            height: "8px",
                            backgroundColor: "rgba(255,255,255,0.3)",
                            borderRadius: "4px",
                            overflow: "hidden"
                        }}
                    >
                        <div
                            style={{
                                width: `${loadProgress}%`,
                                height: "100%",
                                backgroundColor: "#FFD700",
                                borderRadius: "4px",
                            }}
                        />
                    </div>
                </div>
            )}
            {showBlackOverlay && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 10,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        opacity: overlayFadeOut ? 0 : 1,
                        transition: "opacity 0.5s ease-out",
                        pointerEvents: overlayFadeOut ? "none" : "auto"
                    }}
                />
            )}
            {!showSplash && (
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: "100%",
                    zIndex: 5
                }}
            >
                <DoveControlPanel
                    onPlay={handlePlay}
                    onDifficultyChange={handleDifficultyChange}
                    onDisplayModeChange={handleDisplayModeChange}
                    onGo={() => gameRef.current?.triggerMove?.()}
                    onCashOut={() => gameRef.current?.handleCashOut?.()}
                    gameStarted={gameStarted}
                    step={step}
                    betAmount={betAmountRef.current || 0.1}
                    cashOutAmount={gameStarted && step > 0 ? (betAmountRef.current || 0.1) * getMultiplier(step, multiplierParamsRef.current.a, multiplierParamsRef.current.b) : 0}
                    canMove={canMove}
                />
            </div>
            )}
        </div>
    )

}

export default DoveGame