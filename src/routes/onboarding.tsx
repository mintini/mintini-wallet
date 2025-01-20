import {useState} from "react";
import { useLoaderData, useNavigate } from 'react-router-dom';

export function Onboarding() {
  const db = useLoaderData();
  const [step, setStep] = useState(0)
  const navigate = useNavigate();

  const completeOnboarding = async () => {
    await db.put('state', { key: 'onboardingComplete', value: true });
    navigate('/'); // Перенаправляем на главную страницу
  };

  const STEPS = [
    {
      title: 'Mintini',
      description: 'A minty fresh cocktail to get you started.',
      image: '/images/onboarding-01.jpg'
    },
    {
      title: 'Staking',
      description: 'Stake your tokens to earn rewards.',
      image: '/images/onboarding-02.jpg'
    },
    {
      title: 'And much more!',
      description: 'We just starting our journey.',
      image: '/images/onboarding-03.jpg'
    }
  ];

  const handleNext = () => {
    if(step === 2) {
      completeOnboarding()
      navigate('/')
    } else {
      setStep(step + 1)
    }
  }

  return (
    <div className="flex h-full w-full bg-mint-light">
      <div className="flex flex-col w-full p-0">
        <div className="text-4xl font-bold text-black h-auto  mb-10 rounded">
          <img src={STEPS[step].image} className="mix-blend-multiply" alt=""/>
        </div>
        <div className="text-4xl font-bold text-black px-6">
          {STEPS[step].title}
        </div>
        <div className="text-lg text-mint-dark mt-4 px-6">
          {STEPS[step].description}
        </div>
        <div className="flex justify-end mt-8 px-6">
          <button
            onClick={handleNext}
            className="bg-mint-dark text-mint-light px-4 py-2 rounded-md"
          >
            {
              step === STEPS.length - 1
                ? 'Get Started'
                : 'Next'
            }
          </button>
        </div>
      </div>
    </div>
      );
  }
