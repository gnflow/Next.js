// Form Server Component Example
export default function Page() {
    // Action
    async function create(formData: FormData) {
      'use server';
   
      // Logic to mutate data...
    }
   
    // Invoke the action using the "action" attribute
    return <form action={create}>...</form>;
  }