import { Prisma, PrismaClient } from '@prisma/client'

// Helps us bypass RLS and is used as an extension to any existing function
function bypassRLS() {
    return Prisma.defineExtension((prisma) =>
        prisma.$extends({
            query: {
                $allModels: {
                    async $allOperations({ args, query }) {
                        const [, result] = await prisma.$transaction([
                            prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`,
                            query(args),
                        ]);
                        return result;
                    },
                },
            },
        })
    );
}

// Helps us bypass RLS as a specific companyID
function forCompany(companyId: string) {
    return Prisma.defineExtension((prisma) =>
      prisma.$extends({
        query: {
          $allModels: {
            async $allOperations({ args, query }) {
              const [, result] = await prisma.$transaction([
                prisma.$executeRaw`SELECT set_config('app.current_company_id', ${companyId}, TRUE)`,
                query(args),
              ]);
              return result;
            },
          },
        },
      })
    );
  }

const prisma = new PrismaClient()

async function main() {
    // Finds all the current valid policies
    const policies = await prisma.$queryRaw`
        select * from pg_policies
    `;
    console.log(policies);

    // Sets the app.current_company_id so that we access the data as a given user of a company for RLS testing
    const setUserId = await prisma.$executeRaw`SET app.current_company_id = '6a912c04-39c5-4186-9ec1-e863500b7a4a';`;
    
    // Finds all the existing users in the DB
    const findUsers = await prisma.user.findMany();
    console.log(findUsers);

    // Relevant when trying to bypass RLS for any query a user does not have access for
    // const user = await prisma.$extends(bypassRLS()).user.findFirstOrThrow();

    // const companyPrisma = prisma.$extends(forCompany(user.companyId));
    // console.log(companyPrisma);

    // Creates a company called "Company 1" and a corresponding user in the DB
    // await prisma.company.create({
    //     data: {
    //       name: "Company 1",
    //       users: {
    //         create: {
    //           email: "user1@company1.com",
    //         },
    //       },
    //     },
    //   });

    // Creates a company called "Company 2" and a corresponding user in the DB
    // await prisma.company.create({
    // data: {
    //     name: "Company 2",
    //     users: {
    //     create: {
    //         email: "user1@company2.com",
    //     },
    //     },
    // },
    // });

    // Try to query users from Company 1 as a user who should have access
    const company1Users = await prisma.user.findMany({
        where: {
        company: {
            name: "Company 1",
        },
        },
    });
    
    console.log("Users from Company 1:", company1Users);
    
    // Try to query users from Company 2 as a user who should not have access
    const company2Users = await prisma.user.findMany({
        where: {
        company: {
            name: "Company 2",
        },
        },
    });
    
    console.log("Users from Company 2:", company2Users);
}


main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});