/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

// Note: The user mentioned an OpenRouter API key, but per instructions,
// we are using the Google GenAI SDK which uses process.env.API_KEY.
const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });

const seoForm = document.getElementById('seo-form') as HTMLFormElement;
const formFieldset = document.getElementById(
  'form-fieldset',
) as HTMLFieldSetElement;
const apiKeyError = document.getElementById('api-key-error') as HTMLDivElement;
const generateButton = document.getElementById(
  'generate-button',
) as HTMLButtonElement;
const loadingSpinner = document.getElementById(
  'loading-spinner',
) as HTMLDivElement;
const resultsContainer = document.getElementById(
  'results-container',
) as HTMLDivElement;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    url: {
      type: Type.STRING,
      description:
        "Краткий, SEO-дружественный URL-слаг на транслите (латиницей), содержащий только главный ключ, без домена. Например, для 'Современные методы лечения мигрени' результат должен быть 'lechenie-migreni'.",
    },
    title: {
      type: Type.STRING,
      description: 'Привлекательный мета-тег Title, до 60 символов.',
    },
    description: {
      type: Type.STRING,
      description: 'Информативный мета-тег Description, до 160 символов.',
    },
    keywords: {
      type: Type.STRING,
      description:
        'Строка из 5-7 релевантных ключевых слов, разделенных запятыми.',
    },
  },
  required: ['url', 'title', 'description', 'keywords'],
};

// Check for API Key on page load
if (!API_KEY) {
  apiKeyError.innerHTML = `<p><strong>Ошибка конфигурации:</strong> API-ключ не найден.</p>
    <p>Пожалуйста, убедитесь, что переменная окружения <code>API_KEY</code> правильно установлена в настройках вашего проекта на Vercel.</p>`;
  apiKeyError.classList.remove('hidden');
  formFieldset.disabled = true;
}

seoForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(seoForm);
  const articleTitle = formData.get('article-title') as string;
  const articleType = formData.get('article-type') as string;

  if (!articleTitle.trim()) {
    return;
  }

  // UI updates for loading state
  generateButton.disabled = true;
  loadingSpinner.classList.remove('hidden');
  resultsContainer.classList.add('hidden');
  resultsContainer.innerHTML = '';

  try {
    let systemInstruction = '';
    const commercialTypes = ['направление', 'услуга'];

    if (commercialTypes.includes(articleType)) {
      systemInstruction = `Ты — SEO-эксперт. Твоя задача — создавать качественные и продающие SEO-данные для коммерческих страниц сайта медицинской клиники (направления и услуги). Вместо названия конкретной клиники используй слово 'клиника' (с маленькой буквы, если это не начало предложения). Подчеркивай преимущества лечения в клинике, используй призывы к действию (например, 'запишитесь на прием', 'узнайте стоимость'). Слово 'платно' используй умеренно, чтобы указать на коммерческий характер услуг. Убедись, что Title и Description звучат привлекательно для потенциального клиента и мотивируют его перейти на сайт.`;
    } else {
      // Informational pages
      systemInstruction = `Ты — SEO-эксперт. Твоя задача — создавать качественные и информативные SEO-данные для информационных страниц сайта медицинской клиники (описание заболеваний и статьи). Вместо названия конкретной клиники используй слово 'клиника' (с маленькой буквы, если это не начало предложения). Фокусируйся на пользе для читателя, экспертности и полноте информации. Избегай прямых продаж и агрессивных призывов к действию. Если упоминаешь лечение, можешь уместно использовать слово 'платно', чтобы обозначить, что услуги клиники являются платными. Главная цель — предоставить пользователю полезный контент и показать экспертизу клиники. Title и Description должны быть информативными и вызывают доверие.`;
    }

    const contents = `Сгенерируй SEO-данные для страницы типа '${articleType}' с заголовком '${articleTitle}'.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const seoData = JSON.parse(response.text);
    displayResults(seoData, articleType);
  } catch (error) {
    console.error('Error generating SEO data:', error);
    resultsContainer.innerHTML = `<p>Произошла ошибка при генерации данных. Пожалуйста, попробуйте снова.</p><p><i>${error.message}</i></p>`;
  } finally {
    // UI updates to end loading state
    generateButton.disabled = false;
    loadingSpinner.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
  }
});

function displayResults(
  data: {
    url: string;
    title: string;
    description: string;
    keywords: string;
  },
  articleType: string,
) {
  const urlPrefixes: { [key: string]: string } = {
    направление: 'https://www.emcmos.ru/directions/',
    услуга: 'https://www.emcmos.ru/programs_and_services/services/',
    заболевание: 'https://www.emcmos.ru/disease/',
    статья: 'https://www.emcmos.ru/articles/',
  };
  const fullUrl = (urlPrefixes[articleType] || '') + data.url;

  resultsContainer.innerHTML = `
    ${createResultItem('URL', fullUrl)}
    ${createResultItem('Title', data.title)}
    ${createResultItem('Description', data.description)}
    ${createResultItem('Keywords', data.keywords)}
  `;

  document.querySelectorAll('.copy-button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const content = target.dataset.copycontent;
      if (content) {
        navigator.clipboard.writeText(content).then(() => {
          target.textContent = 'Скопировано!';
          setTimeout(() => {
            target.textContent = 'Копировать';
          }, 2000);
        });
      }
    });
  });

  const textareas = document.querySelectorAll<HTMLTextAreaElement>(
    '.result-content',
  );
  textareas.forEach((textarea) => {
    // Auto-resize height to fit content
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    // Select all text on click for convenience
    textarea.addEventListener('click', () => textarea.select());
  });

  // Automatically select the Title field for immediate copying
  const titleTextarea = document.querySelector<HTMLTextAreaElement>(
    '#result-item-title .result-content',
  );
  if (titleTextarea) {
    titleTextarea.select();
  }
}

function createResultItem(label: string, content: string): string {
  // Simple HTML escaping
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `
    <div class="result-item" id="result-item-${label.toLowerCase()}">
      <div class="result-item-header">
        <h3>${label}</h3>
        <button class="copy-button" data-copycontent="${escapedContent}">Копировать</button>
      </div>
      <textarea readonly class="result-content">${escapedContent}</textarea>
    </div>
  `;
}
