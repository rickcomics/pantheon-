// Этот компонент создает анимированную сферу, которая может служить "духовным ядром" в вашем интерфейсе. Вы можете менять цвет сферы через пропсы, и она будет плавно вращаться и пульсировать, создавая эффект живого объекта.
// components/three/SpiritCore.jsx
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, MeshDistortMaterial, Sphere } from '@react-three/drei'
import { useRef } from 'react'

const AnimatedSphere = ({ color }) => {
  const meshRef = useRef()

  // Эта штука заставляет сферу медленно крутиться (как в Unity Update)
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3
  })
  // А эта штука делает так, что сфера слегка пульсирует, увеличиваясь и уменьшаясь в размере
  useFrame((state) => {
  const t = state.clock.getElapsedTime()
  meshRef.current.scale.setScalar(1.5 + Math.sin(t * 0.5) * 0.03)
})

  


  return (
    <Sphere ref={meshRef} args={[1, 100, 100]} scale={1.5}>
      {/* MeshDistortMaterial делает сферу "живой" и текучей */}
      <MeshDistortMaterial
        color={color}
        attach="material"
        emissive={color}
        emissiveIntensity={0.2}
        distort={0.3} // Сила искажения
        speed={2}     // Скорость пульсации
        roughness={0} // Блеск (как на фото)
      />
    </Sphere>
  )
}

export default function SpiritCore({ spiritColor = "#ffffff" }) {
  return (
    <div style={{width: "45px", height: "45px", background: "#f7f7f7"}}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        {/* Выставляем свет как в фотостудии */}
        <ambientLight intensity={0.5} /> 
        <pointLight position={[10, 1, 10]} intensity={3} color="#f7f7f7" />
        <spotLight position={[-10, 1, 10]} angle={0.15} penumbra={1} intensity={2} />

        <AnimatedSphere color={spiritColor} />
        
        {/* Позволяет крутить духа мышкой */}
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  )
}
